import {
  ActionFeedbackModal,
  type ActionFeedbackButton,
} from '@/components/ui/ActionFeedbackModal';
import { AppScreen } from '@/components/ui/AppScreen';
import { Field } from '@/components/ui/Field';
import { FormPanel } from '@/components/ui/FormPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { theme } from '@/constants/theme';
import { useDataRefresh } from '@/context/DataContext';
import { useResponsive } from '@/hooks/useResponsive';
import { deleteCustomer, getCustomer, updateCustomer } from '@/lib/database';
import {
  createEmptyCustomerAddress,
  formatCustomerPhone,
  maskCustomerPhoneInput,
  parseCustomerAddress,
  serializeCustomerAddress,
  serializeCustomerPhone,
  validateCustomerPhone,
  validateCustomerRequiredFields,
  type CustomerAddressFields,
} from '@/lib/customerFields';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

export default function EditarClienteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { refresh } = useDataRefresh();
  const { isDesktop } = useResponsive();
  const customerId = Number(id);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState<CustomerAddressFields>(
    createEmptyCustomerAddress
  );
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    primaryAction?: ActionFeedbackButton;
    secondaryAction?: ActionFeedbackButton;
    onClose?: () => void;
  } | null>(null);

  const phoneError = phone ? validateCustomerPhone(phone) : null;

  const closeFeedback = () => {
    const onClose = feedback?.onClose;
    setFeedback(null);
    onClose?.();
  };

  const updateAddress = (
    key: keyof CustomerAddressFields,
    value: string
  ) => {
    setAddress((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const load = useCallback(async () => {
    if (!Number.isFinite(customerId)) {
      setMissing(true);
      setReady(true);
      return;
    }

    const customer = await getCustomer(customerId);
    if (!customer) {
      setMissing(true);
      setReady(true);
      return;
    }

    setName(customer.name);
    setPhone(formatCustomerPhone(customer.phone) ?? '');
    setAddress(parseCustomerAddress(customer.address));
    setNotes(customer.notes ?? '');
    setReady(true);
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    const validationError = validateCustomerRequiredFields(name, phone, address);
    if (validationError) {
      setFeedback({
        title: validationError.title,
        message: validationError.message,
        secondaryAction: {
          label: 'OK',
        },
      });
      return;
    }

    const trimmedName = name.trim();
    setSaving(true);
    try {
      await updateCustomer(customerId, {
        name: trimmedName,
        phone: serializeCustomerPhone(phone),
        address: serializeCustomerAddress(address),
        notes: notes.trim() || null,
      });
      refresh();
      setFeedback({
        title: 'Cliente atualizado',
        message: 'As alteracoes do cliente foram salvas com sucesso.',
        secondaryAction: {
          label: 'OK',
        },
      });
    } catch (error) {
      console.error(error);
      setFeedback({
        title: 'Erro',
        message: 'Nao foi possivel salvar o cliente.',
        secondaryAction: {
          label: 'OK',
        },
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert('Excluir', 'Excluir este cliente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCustomer(customerId);
            refresh();
            setFeedback({
              title: 'Cliente excluido',
              message: 'O cliente foi removido com sucesso.',
              primaryAction: {
                label: 'Ver clientes',
                onPress: () => router.replace('/clientes'),
              },
              secondaryAction: {
                label: 'OK',
                onPress: () => router.replace('/clientes'),
              },
              onClose: () => router.replace('/clientes'),
            });
          } catch {
            Alert.alert(
              'Nao foi possivel excluir',
              'Existem pedidos vinculados a este cliente.'
            );
          }
        },
      },
    ]);
  };

  return (
    <AppScreen maxWidth={isDesktop ? 1100 : undefined}>
      <PageHeader
        title="Editar Cliente"
        subtitle="Atualize contato, endereco separado e observacoes do cliente."
      />

      {!ready ? (
        <Text style={styles.stateText}>Carregando...</Text>
      ) : missing ? (
        <Text style={styles.stateText}>Cliente nao encontrado.</Text>
      ) : (
        <>
          <View style={[styles.layout, isDesktop && styles.layoutDesktop]}>
            <FormPanel
              title="Contato principal"
              subtitle="Ajuste o nome e o telefone com mascara padrao."
              style={[styles.panel, isDesktop && styles.panelDesktop]}>
              <Field
                label="Nome"
                value={name}
                onChangeText={setName}
                placeholder="Nome do cliente"
              />
              <Field
                label="Telefone"
                value={phone}
                onChangeText={(value) => setPhone(maskCustomerPhoneInput(value))}
                keyboardType="phone-pad"
                placeholder="(11) 91234-5678"
                maxLength={15}
                autoCapitalize="none"
                error={phoneError}
                hint="Aceita telefone fixo com DDD (10 digitos) e celular com DDD (11 digitos)."
              />
            </FormPanel>

            <FormPanel
              title="Endereco"
              subtitle="Mantenha rua, numero, bairro, cidade e complemento organizados."
              style={[styles.panel, isDesktop && styles.panelDesktop]}>
              <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
                <Field
                  label="Rua"
                  value={address.street}
                  onChangeText={(value) => updateAddress('street', value)}
                  placeholder="Rua ou avenida"
                  style={[styles.fullField, isDesktop && styles.streetFieldDesktop]}
                />
                <Field
                  label="Numero"
                  value={address.number}
                  onChangeText={(value) => updateAddress('number', value)}
                  placeholder="Numero"
                  keyboardType="numeric"
                  autoCapitalize="none"
                  style={[styles.halfField, isDesktop && styles.numberFieldDesktop]}
                />
                <Field
                  label="Bairro"
                  value={address.neighborhood}
                  onChangeText={(value) => updateAddress('neighborhood', value)}
                  placeholder="Bairro"
                  style={styles.halfField}
                />
                <Field
                  label="Cidade"
                  value={address.city}
                  onChangeText={(value) => updateAddress('city', value)}
                  placeholder="Cidade"
                  style={styles.halfField}
                />
                <Field
                  label="Complemento"
                  value={address.complement}
                  onChangeText={(value) => updateAddress('complement', value)}
                  placeholder="Apto, bloco, referencia"
                  style={styles.fullField}
                />
              </View>
            </FormPanel>
          </View>

          <FormPanel
            title="Observacoes"
            subtitle="Registre recados de entrega, preferencias ou pontos de referencia."
            style={styles.notesPanel}>
            <Field
              label="Observacoes do cliente"
              value={notes}
              onChangeText={setNotes}
              placeholder="Opcional"
              multiline
              style={styles.fieldNoMargin}
            />
          </FormPanel>

          <PrimaryButton
            title="Salvar alteracoes"
            onPress={save}
            loading={saving}
            style={styles.saveButton}
          />
          <PrimaryButton
            title="Excluir cliente"
            onPress={remove}
            variant="outline"
            style={styles.deleteButton}
          />

          <ActionFeedbackModal
            visible={feedback != null}
            title={feedback?.title ?? ''}
            message={feedback?.message ?? ''}
            onClose={closeFeedback}
            primaryAction={feedback?.primaryAction}
            secondaryAction={feedback?.secondaryAction}
          />
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  stateText: {
    color: theme.colors.textMuted,
  },
  layout: {
    gap: theme.space.md,
  },
  layoutDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  panel: {
    width: '100%',
  },
  panelDesktop: {
    flex: 1,
    minWidth: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridDesktop: {
    alignItems: 'flex-start',
  },
  fullField: {
    width: '100%',
  },
  halfField: {
    width: '48.5%',
  },
  streetFieldDesktop: {
    width: '68%',
  },
  numberFieldDesktop: {
    width: '29%',
  },
  notesPanel: {
    marginTop: theme.space.md,
  },
  fieldNoMargin: {
    marginBottom: 0,
  },
  saveButton: {
    marginTop: theme.space.lg,
  },
  deleteButton: {
    marginTop: theme.space.md,
  },
});
