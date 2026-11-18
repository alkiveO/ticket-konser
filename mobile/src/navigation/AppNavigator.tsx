import React from "react";
import { NativeStackScreenProps, createNativeStackNavigator } from "@react-navigation/native-stack";

import OnboardingScreen from "../screens/OnboardingScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import DetailConcertScreen from "../screens/DetailConcertScreen";
import DetailTicketScreen from "../screens/detailticket";
import MyTicketsScreen from "../screens/MyTicketsScreen";
import OrderScreen from "../screens/OrderScreen";
import PaymentScreen from "../screens/PaymentScreen";
import ProfileScreen from "../screens/ProfileScreen";
import NotificationScreen from "../screens/NotificationScreen";

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Explore: undefined;
  ConcertDetail: { id: number };
  DetailTicket: { id: number };
  MyTickets: undefined;
  Order: { id: number };
  Payment: { id: number };
  Profile: undefined;
  Notification: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ConcertDetail" component={DetailConcertScreen} />
      <Stack.Screen name="DetailTicket" component={DetailTicketScreen} />
      <Stack.Screen name="MyTickets" component={MyTicketsScreen} />
      <Stack.Screen name="Order" component={OrderScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Notification" component={NotificationScreen} />
    </Stack.Navigator>
  );
}