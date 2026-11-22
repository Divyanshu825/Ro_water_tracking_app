import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

export const useNav = () => useNavigation<NativeStackNavigationProp<RootStackParamList>>();
export const useParams = <K extends keyof RootStackParamList>() => useRoute<RouteProp<RootStackParamList, K>>().params as RootStackParamList[K];
