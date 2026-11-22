import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';

/** Lets the user pick an image and copies it to the app's document directory so it survives restarts. */
export async function pickImage(aspect: [number, number] = [1, 1]): Promise<string | undefined> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect });
  if (res.canceled || !res.assets[0]) return undefined;
  const src = res.assets[0].uri;
  try {
    const ext = src.split('.').pop()?.split('?')[0] || 'jpg';
    const dest = new File(Paths.document, `img_${Date.now()}.${ext}`);
    new File(src).copy(dest);
    return dest.uri;
  } catch {
    return src;
  }
}

export function writeTextFile(name: string, content: string): string {
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  f.write(content);
  return f.uri;
}
