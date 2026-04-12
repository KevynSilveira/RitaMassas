import { Image, ImageStyle, StyleProp, StyleSheet } from 'react-native';

const brandMark = require('../../assets/images/brand-chef-hat.png');

type Props = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function BrandMark({ size = 32, style }: Props) {
  return (
    <Image
      source={brandMark}
      resizeMode="contain"
      style={[styles.base, { width: size, height: size }, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    flexShrink: 0,
  },
});
