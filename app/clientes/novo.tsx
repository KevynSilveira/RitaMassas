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
import { insertCustomer } from '@/lib/database';
import {
  createEmptyCustomerAddress,
  maskCustomerPhoneInput,
  serializeCustomerAddress,
  serializeCustomerPhone,
  validateCustomerPhone,
  validateCustomerRequiredFields,
  type CustomerAddressFields,
} from '@/lib/customerFields';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

export default function NovoClienteScreen() {
  const router = useRouter();
  const { refresh } = useDataRefresh();
  const { isDesktop } = useResponsive();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState<CustomerAddressFields>(
    createEmptyCustomerAddress
  );
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    primaryAction?: ActionFeedbackButton;
    secondaryAction?: ActionFeedbackButton;
  } | null>(null);

  const phoneError = phone ? validateCustomerPhone(phone) : null;

  const closeFeedback = () => setFeedback(null);

  const updateAddress = (
    key: keyof CustomerAddressFields,
    value: string
  ) => {
    setAddress((current) => ({
      ...current,
      [key]: value,
    }));
  };

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
      const customerId = await insertCustomer({
        name: trimmedName,
        phone: serializeCustomerPhone(phone),
        address: serializeCustomerAddress(address),
        notes: notes.trim() || null,
      });
      refresh();
      setFeedback({
        title: 'Cliente criado',
        message: 'O cliente foi cadastrado com sucesso.',
        primaryAction: {
          label: 'Ver cliente',
          onPress: () => router.replace(`/clientes/${customerId}`),
        },
        secondaryAction: {
          label: 'OK',
          onPress: () => router.replace('/clientes'),
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

  return (
    <AppScreen maxWidth={isDesktop ? 1100 : undefined}>
      <PageHeader
        title="Novo Cliente"
        subtitle="Cadastre contato, endereco e observacoes no mesmo padrao dos demais paineis."
      />

      <View style={[styles.layout, isDesktop && styles.layoutDesktop]}>
        <FormPanel
          title="Contato principal"
          subtitle="Use nome e telefone com DDD para identificar o cliente."
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
          subtitle="Separe rua, numero, bairro, cidade e complemento."
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
        subtitle="Use este campo para preferencias, ponto de referencia ou recados."
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
        title="Salvar cliente"
        onPress={save}
        loading={saving}
        style={styles.saveButton}
      />

      <ActionFeedbackModal
        visible={feedback != null}
        title={feedback?.title ?? ''}
        message={feedback?.message ?? ''}
        onClose={closeFeedback}
        primaryAction={feedback?.primaryAction}
        secondaryAction={feedback?.secondaryAction}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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
});
