import { theme } from '@/constants/theme';
import { resolveProductPhotoUri } from '@/lib/product-photo';
import { Image, StyleSheet, Text, View } from 'react-native';

type ProductThumbnailProps = {
  photoUri?: string | null;
  size?: number;
};

export function ProductThumbnail({
  photoUri,
  size = 52,
}: ProductThumbnailProps) {
  const resolvedUri = resolveProductPhotoUri(photoUri ?? null) ?? photoUri ?? null;
  const borderRadius = Math.max(12, Math.round(size * 0.24));

  if (resolvedUri) {
    return (
      <Image
        source={{ uri: resolvedUri }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius,
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius,
        },
      ]}>
      <Text
        style={[
          styles.placeholderText,
          {
            fontSize: Math.max(10, Math.round(size * 0.22)),
          },
        ]}>
        Foto
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
  },
  placeholderText: {
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
});
