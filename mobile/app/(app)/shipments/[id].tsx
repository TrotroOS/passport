import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { uploadShipmentDocument } from "@/lib/upload-document";
import { StatusBadge } from "@/components/StatusBadge";
import { ScoreGauge } from "@/components/ScoreGauge";
import { EmptyState } from "@/components/EmptyState";
import type {
  Discrepancy,
  Document,
  Party,
  PassportScore,
  Product,
  Shipment,
  VerificationCheck,
  WorkflowTask,
} from "@/types/database";
import { createPartySchema, createProductSchema, formatDate, formatStatus } from "@/lib/validations";
import { getSeverityStyle } from "@/lib/status";
import { DOCUMENT_TYPES, PARTY_ROLES } from "@/lib/constants";
import { colors, shared } from "@/lib/theme";

type Tab = "overview" | "parties" | "products" | "documents" | "compliance";

export default function ShipmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [score, setScore] = useState<PassportScore | null>(null);
  const [checks, setChecks] = useState<VerificationCheck[]>([]);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;

    const [
      shipRes,
      partiesRes,
      productsRes,
      docsRes,
      scoreRes,
      checksRes,
      discRes,
      tasksRes,
    ] = await Promise.all([
      supabase.from("shipments").select("*").eq("id", id).maybeSingle(),
      supabase.from("parties").select("*").eq("shipment_id", id).order("created_at"),
      supabase.from("products").select("*").eq("shipment_id", id).order("created_at"),
      supabase.from("documents").select("*").eq("shipment_id", id).order("created_at", { ascending: false }),
      supabase
        .from("passport_scores")
        .select("*")
        .eq("shipment_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("verification_checks").select("*").eq("shipment_id", id).order("created_at"),
      supabase.from("discrepancies").select("*").eq("shipment_id", id).order("created_at"),
      supabase.from("workflow_tasks").select("*").eq("shipment_id", id).order("created_at"),
    ]);

    if (shipRes.error || !shipRes.data) {
      setError(shipRes.error?.message ?? "Shipment not found");
    } else {
      setShipment(shipRes.data as Shipment);
      setError(null);
    }

    setParties((partiesRes.data as Party[]) ?? []);
    setProducts((productsRes.data as Product[]) ?? []);
    setDocuments((docsRes.data as Document[]) ?? []);
    setScore((scoreRes.data as PassportScore | null) ?? null);
    setChecks((checksRes.data as VerificationCheck[]) ?? []);
    setDiscrepancies((discRes.data as Discrepancy[]) ?? []);
    setTasks((tasksRes.data as WorkflowTask[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  async function handleUpload() {
    if (!shipment || !profile?.organization_id || !user) return;

    Alert.alert("Upload Document", "Choose document type", [
      ...DOCUMENT_TYPES.map((type) => ({
        text: formatStatus(type),
        onPress: async () => {
          setUploading(true);
          const result = await uploadShipmentDocument({
            shipmentId: shipment.id,
            organizationId: profile.organization_id!,
            userId: user.id,
            docType: type,
          });
          setUploading(false);
          if ("error" in result && result.error !== "Upload cancelled") {
            Alert.alert("Upload failed", result.error);
          } else if ("success" in result) {
            load();
          }
        },
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  }

  if (loading) {
    return (
      <View style={[shared.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !shipment) {
    return (
      <View style={[shared.container, shared.content]}>
        <Text style={shared.error}>{error ?? "Shipment not found"}</Text>
      </View>
    );
  }

  const openIssues = discrepancies.filter((d) => d.status === "open").length;

  return (
    <ScrollView
      style={shared.container}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
      }
    >
      {/* Hero */}
      <View style={hero.card}>
        <View style={hero.header}>
          <Text style={hero.ref}>{shipment.shipment_ref}</Text>
          <StatusBadge status={shipment.status} />
        </View>
        <View style={hero.route}>
          <View style={hero.point}>
            <Text style={hero.label}>Origin</Text>
            <Text style={hero.value}>{shipment.origin_country ?? "Not set"}</Text>
          </View>
          <Ionicons name="airplane" size={20} color={colors.primary} />
          <View style={hero.point}>
            <Text style={hero.label}>Destination</Text>
            <Text style={hero.value}>{shipment.destination_country ?? "Not set"}</Text>
          </View>
        </View>
      </View>

      {/* Quick stats */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <MiniStat icon="people-outline" label="Parties" value={parties.length} />
        <MiniStat icon="cube-outline" label="Products" value={products.length} />
        <MiniStat icon="document-outline" label="Docs" value={documents.length} />
        <MiniStat icon="warning-outline" label="Issues" value={openIssues} accent={openIssues > 0 ? colors.danger : colors.success} />
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(
            [
              ["overview", "Overview"],
              ["parties", "Parties"],
              ["products", "Products"],
              ["documents", "Documents"],
              ["compliance", "Compliance"],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: tab === key ? colors.primary : colors.card,
                borderWidth: 1,
                borderColor: tab === key ? colors.primary : colors.border,
              }}
            >
              <Text style={{ fontWeight: "600", fontSize: 13, color: tab === key ? "#fff" : colors.text }}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {tab === "overview" && (
        <OverviewTab score={score} tasks={tasks} shipment={shipment} />
      )}
      {tab === "parties" && (
        <PartiesTab shipmentId={shipment.id} parties={parties} onAdded={load} />
      )}
      {tab === "products" && (
        <ProductsTab shipmentId={shipment.id} products={products} onAdded={load} />
      )}
      {tab === "documents" && (
        <DocumentsTab
          documents={documents}
          uploading={uploading}
          onUpload={handleUpload}
        />
      )}
      {tab === "compliance" && (
        <ComplianceTab checks={checks} discrepancies={discrepancies} />
      )}
    </ScrollView>
  );
}

function OverviewTab({
  score,
  tasks,
  shipment,
}: {
  score: PassportScore | null;
  tasks: WorkflowTask[];
  shipment: Shipment;
}) {
  return (
    <View style={{ gap: 14 }}>
      <View style={card.box}>
        {score ? (
          <View style={{ alignItems: "center", gap: 16 }}>
            <ScoreGauge score={score.overall_score} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {score.documentation_score != null && (
                <ScorePill label="Docs" value={score.documentation_score} />
              )}
              {score.consistency_score != null && (
                <ScorePill label="Consistency" value={score.consistency_score} />
              )}
              {score.regulatory_score != null && (
                <ScorePill label="Regulatory" value={score.regulatory_score} />
              )}
            </View>
          </View>
        ) : (
          <EmptyState
            icon="analytics-outline"
            title="No score yet"
            message="Upload documents and run verification on the web app to generate a Passport Score."
          />
        )}
      </View>

      <View style={card.box}>
        <Text style={card.title}>Timeline</Text>
        <Text style={card.meta}>Created {formatDate(shipment.created_at)}</Text>
        <Text style={card.meta}>Updated {formatDate(shipment.updated_at)}</Text>
      </View>

      {tasks.length > 0 && (
        <View style={card.box}>
          <Text style={card.title}>Workflow Tasks ({tasks.length})</Text>
          {tasks.map((t) => (
            <View key={t.id} style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontWeight: "600", color: colors.text, flex: 1 }}>{t.title}</Text>
              <StatusBadge status={t.status} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function PartiesTab({
  shipmentId,
  parties,
  onAdded,
}: {
  shipmentId: string;
  parties: Party[];
  onAdded: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [role, setRole] = useState<(typeof PARTY_ROLES)[number]>(PARTY_ROLES[0]);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    const parsed = createPartySchema.safeParse({
      shipment_id: shipmentId,
      role,
      name,
      country: country || null,
    });
    if (!parsed.success) {
      Alert.alert("Error", parsed.error.errors[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("parties").insert(parsed.data);
    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setName("");
    setCountry("");
    setShowForm(false);
    onAdded();
  }

  return (
    <View style={{ gap: 12 }}>
      <Pressable style={shared.button} onPress={() => setShowForm(!showForm)}>
        <Text style={shared.buttonText}>{showForm ? "Cancel" : "+ Add Party"}</Text>
      </Pressable>
      {showForm && (
        <View style={card.box}>
          <ChipPicker label="Role" options={PARTY_ROLES} value={role} onChange={setRole} />
          <Field label="Name" value={name} onChange={setName} />
          <Field label="Country" value={country} onChange={setCountry} />
          <Pressable style={shared.button} onPress={handleAdd} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={shared.buttonText}>Save Party</Text>
            )}
          </Pressable>
        </View>
      )}
      {parties.length === 0 ? (
        <EmptyState icon="people-outline" title="No parties" message="Add sellers, buyers, freight forwarders, and other trade parties." />
      ) : (
        parties.map((p) => (
          <View key={p.id} style={card.box}>
            <Text style={{ fontWeight: "700", fontSize: 16, color: colors.text }}>{p.name}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>
              {formatStatus(p.role)}{p.country ? ` · ${p.country}` : ""}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function ProductsTab({
  shipmentId,
  products,
  onAdded,
}: {
  shipmentId: string;
  products: Product[];
  onAdded: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [hsCode, setHsCode] = useState("");
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    const parsed = createProductSchema.safeParse({
      shipment_id: shipmentId,
      name,
      hs_code: hsCode || null,
      quantity: quantity ? Number(quantity) : null,
      currency: "USD",
    });
    if (!parsed.success) {
      Alert.alert("Error", parsed.error.errors[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("products").insert(parsed.data);
    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setName("");
    setHsCode("");
    setQuantity("");
    setShowForm(false);
    onAdded();
  }

  return (
    <View style={{ gap: 12 }}>
      <Pressable style={shared.button} onPress={() => setShowForm(!showForm)}>
        <Text style={shared.buttonText}>{showForm ? "Cancel" : "+ Add Product"}</Text>
      </Pressable>
      {showForm && (
        <View style={card.box}>
          <Field label="Product name" value={name} onChange={setName} />
          <Field label="HS code" value={hsCode} onChange={setHsCode} />
          <Field label="Quantity" value={quantity} onChange={setQuantity} keyboardType="numeric" />
          <Pressable style={shared.button} onPress={handleAdd} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={shared.buttonText}>Save Product</Text>
            )}
          </Pressable>
        </View>
      )}
      {products.length === 0 ? (
        <EmptyState icon="pricetag-outline" title="No products" message="Add products with HS codes for regulatory checks." />
      ) : (
        products.map((p) => (
          <View key={p.id} style={card.box}>
            <Text style={{ fontWeight: "700", fontSize: 16, color: colors.text }}>{p.name}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>
              {p.hs_code ? `HS ${p.hs_code}` : "No HS code"}
              {p.quantity != null ? ` · Qty ${p.quantity}` : ""}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function DocumentsTab({
  documents,
  uploading,
  onUpload,
}: {
  documents: Document[];
  uploading: boolean;
  onUpload: () => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Pressable style={shared.button} onPress={onUpload} disabled={uploading}>
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={shared.buttonText}>Upload Document</Text>
        )}
      </Pressable>
      {documents.length === 0 ? (
        <EmptyState
          icon="folder-open-outline"
          title="No documents"
          message="Upload invoices, packing lists, bills of lading, and certificates."
        />
      ) : (
        documents.map((d) => (
          <View key={d.id} style={card.box}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontWeight: "700", color: colors.text }}>{formatStatus(d.doc_type)}</Text>
              <StatusBadge status={d.processing_status} />
            </View>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
              {formatDate(d.created_at)}
            </Text>
            {d.processing_error ? (
              <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{d.processing_error}</Text>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

function ComplianceTab({
  checks,
  discrepancies,
}: {
  checks: VerificationCheck[];
  discrepancies: Discrepancy[];
}) {
  const open = discrepancies.filter((d) => d.status === "open");

  return (
    <View style={{ gap: 12 }}>
      <View style={card.box}>
        <Text style={card.title}>Verification Checks ({checks.length})</Text>
        {checks.length === 0 ? (
          <Text style={card.meta}>No checks run yet</Text>
        ) : (
          checks.map((c) => (
            <View key={c.id} style={{ marginTop: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text style={{ fontWeight: "600", color: colors.text, flex: 1 }}>
                  {formatStatus(c.check_type)}
                </Text>
                <StatusBadge status={c.status} />
              </View>
            </View>
          ))
        )}
      </View>

      <View style={card.box}>
        <Text style={card.title}>Open Discrepancies ({open.length})</Text>
        {open.length === 0 ? (
          <Text style={[card.meta, { color: colors.success }]}>No open issues</Text>
        ) : (
          open.map((d) => {
            const sev = getSeverityStyle(d.severity);
            return (
              <View
                key={d.id}
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: sev.bg,
                }}
              >
                <Text style={{ fontWeight: "700", color: sev.text }}>{formatStatus(d.discrepancy_type)}</Text>
                <Text style={{ color: colors.text, marginTop: 4, fontSize: 13 }}>{d.description}</Text>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

function MiniStat({
  icon,
  label,
  value,
  accent = colors.primary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
      <Ionicons name={icon} size={18} color={accent} />
      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 4 }}>{value}</Text>
      <Text style={{ fontSize: 10, color: colors.muted, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ backgroundColor: "#f1f5f9", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>
        {label}: <Text style={{ color: colors.text }}>{Math.round(value)}</Text>
      </Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={shared.label}>{label}</Text>
      <TextInput
        style={shared.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function ChipPicker<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={shared.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: value === opt ? colors.primary : "#f1f5f9",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: value === opt ? "#fff" : colors.text }}>
                {formatStatus(opt)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const hero = {
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  header: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "flex-start" as const, gap: 8 },
  ref: { fontSize: 22, fontWeight: "800" as const, color: colors.text, flex: 1 },
  route: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12 },
  point: { flex: 1 },
  label: { fontSize: 11, color: colors.muted, fontWeight: "600" as const, textTransform: "uppercase" as const },
  value: { fontSize: 16, fontWeight: "700" as const, color: colors.text, marginTop: 2 },
};

const card = {
  box: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: "700" as const, color: colors.text, marginBottom: 8 },
  meta: { fontSize: 13, color: colors.muted, marginTop: 4 },
};
