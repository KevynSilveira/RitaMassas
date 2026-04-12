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
import { insertProduct } from '@/lib/database';
import {
  createPendingProductPhotoUpload,
  persistProductPhoto,
  resolveProductPhotoUri,
  type PendingProductPhotoUpload,
} from '@/lib/product-photo';
import {
  maskProductPriceInput,
  parseProductPrice,
} from '@/lib/productPrice';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

export default function NovoProdutoScreen() {
  const router = useRouter();
  const { refresh } = useDataRefresh();
  const { isDesktop } = useResponsive();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [recipe, setRecipe] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [pendingPhotoUpload, setPendingPhotoUpload] =
    useState<PendingProductPhotoUpload | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    primaryAction?: ActionFeedbackButton;
    secondaryAction?: ActionFeedbackButton;
  } | null>(null);

  const closeFeedback = () => setFeedback(null);

  const pickImage = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permissao', 'Precisamos acessar suas fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPendingPhotoUpload(
        await createPendingProductPhotoUpload(result.assets[0])
      );
    }
  };

  const save = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Nome', 'Informe o nome da massa.');
      return;
    }

    const parsedPrice = parseProductPrice(price);
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Valor', 'Informe um valor valido maior que zero.');
      return;
    }

    setSaving(true);
    try {
      const persistedPhotoUri = await persistProductPhoto(
        photoUri,
        pendingPhotoUpload
      );
      const productId = await insertProduct({
        name: trimmedName,
        price: parsedPrice,
        recipe: recipe.trim() || null,
        photo_uri: persistedPhotoUri,
      });
      refresh();
      setFeedback({
        title: 'Massa criada',
        message: 'A massa foi cadastrada com sucesso.',
        primaryAction: {
          label: 'Ver massa',
          onPress: () => router.replace(`/produtos/${productId}`),
        },
        secondaryAction: {
          label: 'OK',
          onPress: () => router.replace('/produtos'),
        },
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Nao foi possivel salvar a massa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen maxWidth={isDesktop ? 1100 : undefined}>
      <PageHeader
        title="Nova Massa"
        subtitle="Cadastre foto, nome, valor e receita no mesmo padrao visual dos demais paineis."
      />

      <View style={[styles.layout, isDesktop && styles.layoutDesktop]}>
        <FormPanel
          title="Apresentacao"
          subtitle="Adicione a foto principal, nome e valor de venda."
          style={[styles.panel, isDesktop && styles.panelDesktop]}>
          <Pressable onPress={pickImage} style={styles.photoBox}>
            {photoUri ? (
              <Image
                source={{ uri: resolveProductPhotoUri(photoUri) ?? photoUri }}
                style={styles.photo}
              />
            ) : (
              <Text style={styles.photoHint}>Toque para adicionar foto</Text>
            )}
          </Pressable>
          <Text style={styles.photoSizeHint}>
            Tamanho recomendado: 1200 x 1200 px, imagem quadrada.
          </Text>

          <Field
            label="Nome"
            value={name}
            onChangeText={setName}
            placeholder="Nome da massa"
          />
          <Field
            label="Valor (R$)"
            value={price}
            onChangeText={(value) => setPrice(maskProductPriceInput(value))}
            keyboardType="decimal-pad"
            placeholder="25,00"
            autoCapitalize="none"
            hint="Use o valor final de venda. Exemplo: 25,00."
            style={styles.fieldNoMargin}
          />
        </FormPanel>

        <FormPanel
          title="Receita e preparo"
          subtitle="Registre ingredientes, recheios ou modo de preparo."
          style={[styles.panel, isDesktop && styles.panelDesktop]}>
          <Field
            label="Receita"
            value={recipe}
            onChangeText={setRecipe}
            multiline
            placeholder="Ingredientes ou modo de preparo"
            style={styles.fieldNoMargin}
          />
        </FormPanel>
      </View>

      <PrimaryButton title="Salvar massa" onPress={save} loading={saving} style={styles.saveButton} />

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
  photoBox: {
    height: 180,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoHint: {
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  photoSizeHint: {
    marginTop: -4,
    marginBottom: theme.space.md,
    color: theme.colors.textMuted,
    fontSize: theme.font.caption,
    lineHeight: 18,
  },
  fieldNoMargin: {
    marginBottom: 0,
  },
  saveButton: {
    marginTop: theme.space.lg,
  },
});
