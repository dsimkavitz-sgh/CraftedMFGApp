import {
  can,
  createPurchaseOrder,
  listInventory,
  listSuppliers,
  purchaseOrderSchema,
} from "@crafted/shared";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SelectSheet, type SelectOption } from "@/components/ui/SelectSheet";
import { TextField } from "@/components/ui/TextField";
import { useSession } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { todayIsoDate, zodFieldErrors, type FieldErrors } from "@/lib/forms";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { spacing, useTheme } from "@/theme/tokens";

interface LineItemDraft {
  key: string;
  variant_id: string | null;
  qty: number;
  unit_cost: string;
}

let draftCounter = 0;
function newDraft(): LineItemDraft {
  draftCounter += 1;
  return { key: `li-${draftCounter}`, variant_id: null, qty: 1, unit_cost: "" };
}

export default function NewPurchaseOrderScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { role } = useSession();

  const suppliers = useAsync(() => listSuppliers(supabase), []);
  const variants = useAsync(() => listInventory(supabase), []);

  const [poNumber, setPoNumber] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [orderDate, setOrderDate] = useState(todayIsoDate());
  const [eta, setEta] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([newDraft()]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  if (!can.editPurchaseOrders(role)) {
    return <Redirect href="/(tabs)/orders" />;
  }

  const variantOptions: SelectOption[] = (variants.data ?? []).map((v) => ({
    value: v.id,
    label: v.sku,
    sublabel: `${v.style?.name ?? "Unknown style"} · ${v.color} / ${v.size}`,
  }));

  const updateLine = (key: string, patch: Partial<LineItemDraft>) => {
    setLineItems((items) => items.map((li) => (li.key === key ? { ...li, ...patch } : li)));
  };

  const submit = async () => {
    const candidate = {
      po_number: poNumber,
      supplier_id: supplierId ?? "",
      order_date: orderDate.trim(),
      eta: eta.trim() ? eta.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
      line_items: lineItems.map((li) => ({
        variant_id: li.variant_id ?? "",
        qty: li.qty,
        unit_cost: li.unit_cost.trim() ? Number(li.unit_cost) : null,
      })),
    };
    const parsed = purchaseOrderSchema.safeParse(candidate);
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const po = await createPurchaseOrder(supabase, parsed.data);
      router.replace(`/order/${po.id}`);
    } catch (e) {
      Alert.alert("Could not create PO", errorMessage(e));
      setSubmitting(false);
    }
  };

  return (
    <Screen keyboard>
      <TextField
        label="PO number"
        value={poNumber}
        onChangeText={setPoNumber}
        error={fieldErrors["po_number"]}
        placeholder="PO-1042"
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <SelectSheet
        label="Supplier"
        placeholder="Pick a supplier"
        value={supplierId}
        options={(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
        onChange={setSupplierId}
        error={fieldErrors["supplier_id"]}
        style={styles.field}
      />
      <TextField
        label="Order date"
        value={orderDate}
        onChangeText={setOrderDate}
        error={fieldErrors["order_date"]}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
      />
      <TextField
        label="ETA (optional)"
        value={eta}
        onChangeText={setEta}
        error={fieldErrors["eta"]}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
      />
      <TextField
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="Anything the team should know"
        multiline
      />

      <SectionHeader
        title="Line items"
        action={
          <Button
            title="+ Add item"
            variant="ghost"
            small
            onPress={() => setLineItems((items) => [...items, newDraft()])}
          />
        }
      />
      {fieldErrors["line_items"] ? (
        <Text style={[styles.rootError, { color: theme.danger }]}>
          {fieldErrors["line_items"]}
        </Text>
      ) : null}

      {lineItems.map((li, i) => (
        <Card key={li.key} style={styles.lineCard}>
          <View style={styles.lineHeader}>
            <Text style={[styles.lineTitle, { color: theme.muted }]}>ITEM {i + 1}</Text>
            {lineItems.length > 1 ? (
              <Button
                title="Remove"
                variant="ghost"
                small
                onPress={() =>
                  setLineItems((items) => items.filter((x) => x.key !== li.key))
                }
              />
            ) : null}
          </View>
          <SelectSheet
            label="Variant"
            placeholder="Pick a variant"
            value={li.variant_id}
            options={variantOptions}
            onChange={(value) => updateLine(li.key, { variant_id: value })}
            error={fieldErrors[`line_items.${i}.variant_id`]}
            style={styles.field}
          />
          <View style={styles.lineRow}>
            <View>
              <Text style={[styles.inlineLabel, { color: theme.muted }]}>QTY</Text>
              <QtyStepper
                value={li.qty}
                min={1}
                onChange={(qty) => updateLine(li.key, { qty })}
              />
              {fieldErrors[`line_items.${i}.qty`] ? (
                <Text style={[styles.rootError, { color: theme.danger }]}>
                  {fieldErrors[`line_items.${i}.qty`]}
                </Text>
              ) : null}
            </View>
            <TextField
              label="Unit cost (optional)"
              value={li.unit_cost}
              onChangeText={(text) => updateLine(li.key, { unit_cost: text })}
              error={fieldErrors[`line_items.${i}.unit_cost`]}
              placeholder="4.50"
              keyboardType="decimal-pad"
              containerStyle={styles.costField}
            />
          </View>
        </Card>
      ))}

      <Button
        title="Create purchase order"
        loading={submitting}
        onPress={() => void submit()}
        style={styles.submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing(3),
  },
  rootError: {
    fontSize: 13,
    marginBottom: spacing(2),
  },
  lineCard: {
    marginBottom: spacing(3),
  },
  lineHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing(2),
  },
  lineTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(4),
  },
  inlineLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing(1),
    letterSpacing: 0.5,
  },
  costField: {
    flex: 1,
    marginBottom: 0,
  },
  submit: {
    marginTop: spacing(2),
    marginBottom: spacing(8),
  },
});
