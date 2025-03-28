
import { useState } from "react";
import { useRouter } from "expo-router";
import { 
  Text, 
  TouchableWithoutFeedback, 
  View, 
  Image, 
  TouchableHighlight, 
  ActivityIndicator, 
  TextInput, 
  Alert 
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { Picker } from "@react-native-picker/picker"; // Install via: npm install @react-native-picker/picker

const SERVER_API =  process.env.EXPO_PUBLIC_API_URL
const SOCKET_API_URL =  process.env.EXPO_PUBLIC_SOCKET_URL

const DriverRegister = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm]: any = useState({
    name: "",
    number: "",
    email: "",
    password: "",
    userType: "ambulance",  // Default to driver
    vehicleId: "",
    vehicleType: "basic", // Default vehicle type
  });

  const handleClose = () => {
    router.back();
  };

  const handleRegister = async () => {
    if (!form.name || !form.number || !form.email || !form.password ) {
      Alert.alert("Error", "All fields are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(SERVER_API+"/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      console.log(data.message)
      if (response.ok) {
        Alert.alert("Success", "Driver registration successful!");
        router.replace("/(auth)/login"); // Navigate after registration
      } else {
        Alert.alert("Error", data.message || "Registration failed");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#1A4041] justify-evenly p-6">
      {/* Close Button */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <View className="absolute top-5 right-5 my-1">
          <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M18 6L6 18M6 6l12 12" />
          </Svg>
        </View>
      </TouchableWithoutFeedback>

      {/* Logo */}
      <View className="items-center">
        <Image source={require("@/assets/images/logo-small.png")} className="h-40 w-40" resizeMode="contain" />
      </View>

      {/* Form Inputs */}
      <View className="mx-6">
        {["Name", "Number", "Email", "Password"].map((field, index) => (
          <TextInput
            key={index}
            placeholder={field}
            secureTextEntry={field === "Password"}
            keyboardType={field === "Number" ? "phone-pad" : "default"}
            className="bg-gray-200 text-gray-800 text-lg px-4 py-3 rounded-lg mb-3"
            value={form[field.toLowerCase()]}
            onChangeText={(text) => setForm({ ...form, [field.toLowerCase()]: text })}
          />
        ))}

   

        {/* Vehicle Type Picker */}
        <Picker
          selectedValue={form.vehicleType}
          style={{ backgroundColor: "#fff", marginBottom: 15 }}
          onValueChange={(itemValue:any) => setForm({ ...form, vehicleType: itemValue })}
        >
          <Picker.Item label="Basic" value="basic" />
          <Picker.Item label="Advanced" value="advanced" />
          <Picker.Item label="ICU" value="icu" />
        </Picker>

        {/* Register Button */}
        <TouchableHighlight
          className="bg-white px-10 py-3 rounded-lg mx-6 mt-4"
          underlayColor="#ddd"
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="large" className="h-8" color="#1A4041" />
          ) : (
            <Text className="text-2xl font-bold text-[#1A4041] text-center">Register as Driver</Text>
          )}
        </TouchableHighlight>
      </View>
    </View>
  );
};

export default DriverRegister;
