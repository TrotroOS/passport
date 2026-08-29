const DEFAULT_API_URL = "https://api.terminal49.com/v2";

export interface Terminal49JsonApiResource<TAttributes> {
  id: string;
  type: string;
  attributes: TAttributes;
}

export interface Terminal49ListResponse<TAttributes> {
  data: Terminal49JsonApiResource<TAttributes>[];
}

export class Terminal49ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string
  ) {
    super(message);
    this.name = "Terminal49ApiError";
  }
}

export class Terminal49Client {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, apiUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = (apiUrl ?? DEFAULT_API_URL).replace(/\/$/, "");
  }

  private async request<T>(
    path: string,
    init?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Token ${this.apiKey}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(20_000),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Terminal49ApiError(
        `Terminal49 API ${response.status}`,
        response.status,
        text
      );
    }

    return text ? (JSON.parse(text) as T) : ({} as T);
  }

  async createTrackingRequest(params: {
    requestType: "container" | "bill_of_lading" | "booking";
    requestNumber: string;
    scac?: string;
  }): Promise<{ id: string }> {
    const attributes: Record<string, string> = {
      request_type: params.requestType,
      request_number: params.requestNumber,
    };
    if (params.scac) {
      attributes.scac = params.scac;
    }

    const payload = await this.request<{
      data: Terminal49JsonApiResource<Record<string, unknown>>;
    }>("/tracking_requests", {
      method: "POST",
      body: JSON.stringify({
        data: {
          type: "tracking_request",
          attributes,
        },
      }),
    });

    return { id: payload.data.id };
  }

  async findContainerByNumber(containerNumber: string) {
    const encoded = encodeURIComponent(containerNumber);
    const payload = await this.request<
      Terminal49ListResponse<Record<string, unknown>>
    >(`/containers?filter[number]=${encoded}&page[size]=1`);

    return payload.data[0] ?? null;
  }

  async refreshContainer(containerId: string): Promise<void> {
    await this.request(`/containers/${containerId}/refresh`, {
      method: "POST",
      body: JSON.stringify({ data: {} }),
    });
  }
}

const CARRIER_SCAC_ALIASES: Record<string, string> = {
  MAERSK: "MAEU",
  "CMA CGM": "CMDU",
  CMACGM: "CMDU",
  MSC: "MSCU",
  "HAPAG-LLOYD": "HLCU",
  HAPAG: "HLCU",
  COSCO: "COSU",
  EVERGREEN: "EGLV",
  ONE: "ONEY",
  "OCEAN NETWORK EXPRESS": "ONEY",
  "YANG MING": "YMLU",
  ZIM: "ZIMU",
  PIL: "PCIU",
  "PACIFIC INTERNATIONAL LINES": "PCIU",
};

export function inferCarrierScac(carrier?: string | null): string | undefined {
  if (!carrier?.trim()) return undefined;
  const normalized = carrier.trim().toUpperCase();
  if (/^[A-Z]{4}$/.test(normalized)) return normalized;
  return CARRIER_SCAC_ALIASES[normalized];
}
