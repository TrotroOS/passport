"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_DESTINATION_OPTIONS } from "@/lib/regulatory/jurisdiction";

interface CorridorCountrySelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CorridorCountrySelect({
  id,
  value,
  onChange,
  placeholder = "Select import corridor",
  disabled = false,
}: CorridorCountrySelectProps) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_DESTINATION_OPTIONS.map((option) => (
          <SelectItem key={option.code} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
