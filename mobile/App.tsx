import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

import OnboardingScreen from './src/screens/OnboardingScreen';
import DetailConcertScreen from './src/screens/DetailConcertScreen';
import HomeScreen from './src/screens/HomeScreen';
import OrderScreen from './src/screens/OrderScreen'; // sesuaikan nama file kamu
import PaymentScreen from './src/screens/PaymentScreen'; // sesuaikan nama file kamu
import SeatSelectionScreen from './src/screens/SeatSelectionScreen'; // sesuaikan nama file kamu
import MyTicketsScreen from './src/screens/MyTicketsScreen'; // sesuaikan nama file kamu
import ProfileScreen from './src/screens/ProfileScreen'; // sesuaikan nama file kamu
import detailticket from './src/screens/detailticket'; // sesuaikan nama file kamu
import NotificationScreen from './src/screens/NotificationScreen';
import ExploreScreen from './src/screens/ExploreScreen'; // sesuaikan nama file kamu
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{ headerShown: false }}
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
      <StatusBar style="light" />
    </NavigationContainer>
  );
}