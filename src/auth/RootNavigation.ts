import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from '@/navigation/RootNavigator';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
