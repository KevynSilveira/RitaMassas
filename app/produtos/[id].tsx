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
import { deleteProduct, getProduct, updateProduct } from '@/lib/database';
import {
  createPendingProductPhotoUpload,
  persistProductPhoto,
  resolveProductPhotoUri,
  type PendingProductPhotoUpload,
} from '@/lib/product-photo';
import {
  formatProductPriceInput,
  maskProductPriceInput,
  parseProductPrice,
} from '@/lib/productPrice';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

export default function EditarProdutoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { refresh } = useDataRefresh();
  const { isDesktop } = useResponsive();
  const productId = Number(id);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [recipe, setRecipe] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [pendingPhotoUpload, setPendingPhotoUpload] =
    useState<PendingProductPhotoUpload | null>(null);
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

  const closeFeedback = () => {
    const onClose = feedback?.onClose;
    setFeedback(null);
    onClose?.();
  };

  const load = useCallback(async () => {
    if (!Number.isFinite(productId)) {
      setMissing(true);
      setReady(true);
      return;
    }

    const product = await getProduct(productId);
    if (!product) {
      setMissing(true);
      setReady(true);
      return;
    }

    setName(product.name);
    setPrice(formatProductPriceInput(product.price));
    setRecipe(product.recipe ?? '');
    setPhotoUri(product.photo_uri);
    setPendingPhotoUpload(null);
    setReady(true);
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

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
      await updateProduct(productId, {
        name: trimmedName,
        price: parsedPrice,
        recipe: recipe.trim() || null,
        photo_uri: persistedPhotoUri,
      });
      refresh();
      setFeedback({
        title: 'Massa atualizada',
        message: 'As alteracoes da massa foram salvas com sucesso.',
        secondaryAction: {
          label: 'OK',
        },
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Nao foi possivel salvar a massa.');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert(
      'Excluir',
      'Excluir esta massa? Pedidos antigos podem manter referencia.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(productId);
              refresh();
              setFeedback({
                title: 'Massa excluida',
                message: 'A massa foi removida com sucesso.',
                primaryAction: {
                  label: 'Ver massas',
                  onPress: () => router.replace('/produtos'),
                },
                secondaryAction: {
                  label: 'OK',
                  onPress: () => router.replace('/produtos'),
                },
                onClose: () => router.replace('/produtos'),
              });
            } catch {
              Alert.alert(
                'Nao foi possivel excluir',
                'Provavelmente existe pedido vinculado a esta massa.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <AppScreen maxWidth={isDesktop ? 1100 : undefined}>
      <PageHeader
        title="Editar Massa"
        subtitle="Atualize foto, valor e receita no mesmo padrao visual dos demais paineis."
      />

      {!ready ? (
        <Text style={styles.stateText}>Carregando...</Text>
      ) : missing ? (
        <Text style={styles.stateText}>Massa nao encontrada.</Text>
      ) : (
        <>
          <View style={[styles.layout, isDesktop && styles.layoutDesktop]}>
            <FormPanel
              title="Apresentacao"
              subtitle="Ajuste a foto principal, o nome e o valor atual."
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
              subtitle="Atualize ingredientes, recheios ou modo de preparo."
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

          <PrimaryButton
            title="Salvar alteracoes"
            onPress={save}
            loading={saving}
            style={styles.saveButton}
          />
          <PrimaryButton
            title="Excluir massa"
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
  deleteButton: {
    marginTop: theme.space.md,
  },
});
