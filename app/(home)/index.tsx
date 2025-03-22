import React, { useState, useEffect } from "react";
import { View, Image, StyleSheet, Alert, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import Svg, { Path } from "react-native-svg";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import mapStyle from "@/assets/mapStyle.json"; // Dark mode map style

const Home = () => {
  const [location, setLocation]: any = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

  return (
    <View className="flex-1 bg-primary"> {/* Dark background */}
      {/* Header with Hamburger & Profile Icon */}
      <View className="flex justify-between flex-row m-5">
        {/* Hamburger Icon */}
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

        <Image
          source={require("@/assets/images/profile.png")}
          className="h-12 w-12"
          resizeMode="contain"
        />
      </View>

      {/* Google Map View with User's Location */}
      <View style={styles.container}>
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

      {/* Emergency Button - Overlay at Bottom */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.emergencyButton} onPress={() => Alert.alert("Emergency!", "Calling for an ambulance...")}>
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
    backgroundColor: "#ff3b30", // Primary emergency color (Red)
    paddingVertical: 15,
    width: "100%",
    borderRadius: 10,
    alignItems: "center",
    elevation: 5, // For shadow effect
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
    backgroundColor: "#1e1e1e", // Dark background to match the theme
  },
  placeholderText: {
    color: "white",
    fontSize: 18,
    marginTop: 10,
  },
});