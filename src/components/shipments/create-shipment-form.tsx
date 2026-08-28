"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createShipmentAction, type ActionResult } from "@/lib/actions/auth";
import {
  createShipmentSchema,
  type CreateShipmentInput,
} from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const initialState: ActionResult = { success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating..." : "Create shipment"}
    </Button>
  );
}

export function CreateShipmentForm() {
  const [state, formAction] = useActionState(createShipmentAction, initialState);

  const form = useForm<CreateShipmentInput>({
    resolver: zodResolver(createShipmentSchema),
    defaultValues: {
      shipment_ref: "",
      origin_country: "",
      destination_country: "",
    },
  });

  useEffect(() => {
    if (state.error && !state.success) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Shipment</CardTitle>
        <CardDescription>
          Enter basic shipment details to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form action={formAction} className="space-y-4">
            <FormField
              control={form.control}
              name="shipment_ref"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shipment reference</FormLabel>
                  <FormControl>
                    <Input placeholder="SHP-2026-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="origin_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origin country</FormLabel>
                    <FormControl>
                      <Input placeholder="United States" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destination_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination country</FormLabel>
                    <FormControl>
                      <Input placeholder="Germany" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <SubmitButton />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
