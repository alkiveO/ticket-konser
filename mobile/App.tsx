
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DetailConcertScreen from './src/screens/DetailConcertScreen';
import HomeScreen from './src/screens/HomeScreen';
import OrderScreen from './src/screens/OrderScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import SeatSelectionScreen from './src/screens/SeatSelectionScreen';
import MyTicketsScreen from './src/screens/MyTicketsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import detailticket from './src/screens/detailticket';
import NotificationScreen from './src/screens/NotificationScreen';
import ExploreScreen from './src/screens/ExploreScreen';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { colors } = useTheme();

  return (
    <>
      <NavigationContainer
        theme={{
          dark: colors.statusBar === 'light',
          colors: {
            primary: colors.primary,
            background: colors.background,
            card: colors.card,
            text: colors.text,
            border: colors.border,
            notification: colors.primary,
          },
          fonts: {
            regular: {
              fontFamily: 'System',
              fontWeight: '400',
            },
            medium: {
              fontFamily: 'System',
              fontWeight: '500',
            },
            bold: {
              fontFamily: 'System',
              fontWeight: '700',
            },
            heavy: {
              fontFamily: 'System',
              fontWeight: '900',
            },
          },
        }}
      >
        <Stack.Navigator
          initialRouteName="Onboarding"
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: colors.background,
            },
          }}
        >
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ConcertDetail" component={DetailConcertScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="SelectTicket" component={OrderScreen} />
          <Stack.Screen name="SeatSelection" component={SeatSelectionScreen} />
          <Stack.Screen name="MyTickets" component={MyTicketsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="detailticket" component={detailticket} />
          <Stack.Screen name="Notification" component={NotificationScreen} />
          <Stack.Screen name="Explore" component={ExploreScreen} />
        </Stack.Navigator>
      </NavigationContainer>

      <StatusBar style={colors.statusBar} />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}
