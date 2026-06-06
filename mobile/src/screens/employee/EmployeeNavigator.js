import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import EmployeeHomeScreen from './EmployeeHomeScreen';
import BookMealScreen from './BookMealScreen';
import MyBookingsScreen from './MyBookingsScreen';
import MoreScreen from './MoreScreen';
import WeeklyBookingScreen from './WeeklyBookingScreen';
import NotificationsScreen from './NotificationsScreen';
import FeedbackScreen from './FeedbackScreen';
import MyBillScreen from './MyBillScreen';
import EventsScreen from './EventsScreen';
import ProfileScreen from './ProfileScreen';
import ContactUsScreen from './ContactUsScreen';
import EventAttendanceScreen from './EventAttendanceScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BookMealStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BookMealMain" component={BookMealScreen} />
      <Stack.Screen name="WeeklyBooking" component={WeeklyBookingScreen} />
    </Stack.Navigator>
  );
}

function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreMain" component={MoreScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
      <Stack.Screen name="MyBill" component={MyBillScreen} />
      <Stack.Screen name="Events" component={EventsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ContactUs" component={ContactUsScreen} />
      <Stack.Screen name="EventAttendance" component={EventAttendanceScreen} />
    </Stack.Navigator>
  );
}

export default function EmployeeNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#1A7A4A',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E8F5EF',
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'BookMeal') {
            iconName = focused ? 'restaurant' : 'restaurant-outline';
          } else if (route.name === 'MyBookings') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'More') {
            iconName = focused ? 'menu' : 'menu-outline';
          }
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={EmployeeHomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="BookMeal"
        component={BookMealStack}
        options={{ tabBarLabel: 'Book Meal' }}
      />
      <Tab.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{ tabBarLabel: 'My Bookings' }}
      />
      <Tab.Screen
        name="More"
        component={MoreStack}
        options={{ tabBarLabel: 'More' }}
      />
    </Tab.Navigator>
  );
}
