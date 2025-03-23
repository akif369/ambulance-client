import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import mapStyle from "@/assets/mapStyle.json"; // Dark mode map style
import axios from "axios"; // Import Axios for API calls

const Home = () => {
  const [location, setLocation]: any = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile]: any = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkUserProfile = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          router.replace("/(auth)"); // Redirect to auth if not authenticated
          return;
        }

        // Fetch user profile
        const response = await axios.get("http://192.168.215.61:3000/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const profile = response.data;
        setUserProfile(profile);

        if (profile.user.userType === "ambulance") {
          router.replace("/(driver)");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        router.replace("/(auth)"); // Fallback to auth page if request fails
      }
    };

    checkUserProfile();

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Allow location access to use this feature.");
        setIsLoading(false);
        return;
      }
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      setIsLoading(false);
    })();
  }, []);

  // Function to handle logout
  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("token");
              router.replace("/(auth)");
            } catch (error) {
              console.error("Error removing token:", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Hamburger Icon */}
        <TouchableOpacity onPress={handleLogout}>
          <Svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M3 12h18M3 6h18M3 18h18" />
          </Svg>
        </TouchableOpacity>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Image
            source={userProfile?.profileImage ? { uri: userProfile.profileImage } : require("@/assets/images/profile.png")}
            style={styles.profileImage}
            resizeMode="cover"
          />
          <Text style={styles.profileName}>{userProfile?.name || "User"}</Text>
        </View>
      </View>

      {/* Google Map View */}
      <View style={styles.mapContainer}>
        {isLoading ? (
          <View style={styles.placeholder}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.placeholderText}>Loading map...</Text>
          </View>
        ) : location ? (
          <MapView
            style={styles.map}
            customMapStyle={mapStyle}
            initialRegion={location}
            showsUserLocation={true}
          >
            <Marker coordinate={location} title="You are here" />
          </MapView>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Unable to load map.</Text>
          </View>
        )}
      </View>

      {/* Emergency Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.emergencyButton}
          onPress={() => Alert.alert("Emergency!", "Calling for an ambulance...")}
        >
          <Text style={styles.buttonText}>EMERGENCY</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212", // Dark background
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  profileName: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  mapContainer: {
    flex: 1,
    marginTop: 10,
  },
  map: {
    flex: 1,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  emergencyButton: {
    backgroundColor: "#ff3b30",
    paddingVertical: 15,
    width: "100%",
    borderRadius: 10,
    alignItems: "center",
    elevation: 5,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
  },
  placeholderText: {
    color: "white",
    fontSize: 18,
    marginTop: 10,
  },
});
