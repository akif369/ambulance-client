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

const SERVER_API =  process.env.EXPO_PUBLIC_API_URL
const SOCKET_API_URL =  process.env.EXPO_PUBLIC_SOCKET_URL

const Register = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm]:any = useState({
    name: "",
    number: "",
    email: "",
    password: "",
  });

  const handleClose = () => {
    router.back();
  };

  const handleRegister = async () => {
    if (!form.name || !form.number || !form.email || !form.password) {
      Alert.alert("Error", "All fields are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(SERVER_API+"/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Registration successful!");
        router.replace("/(auth)"); // Navigate to home screen after registration
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
      {/* Help Button */}
      <TouchableWithoutFeedback onPress={() => router.push("/(driver)/register")}>
        <Text  className="absolute top-5 left-5 font-semibold text-white text-md opacity-90">Register Driver?</Text>
      </TouchableWithoutFeedback>

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
        <Image source={require("@/assets/images/logo-small.png")} className="h-40 w-40 " resizeMode="contain" />
      </View>

      {/* Form Inputs */}
      <View className="mx-6 ">
        {["Name", "Number", "Email", "Password"].map((field, index) => (
          <TextInput
            key={index}
            placeholder={field}
            secureTextEntry={field === "Password"}
            keyboardType={(field == "Number")?"phone-pad":"default"}
            className="bg-gray-200 text-gray-800 text-lg px-4 py-3 rounded-lg mb-3"
            value={form[field.toLowerCase()]}
            onChangeText={(text) => setForm({ ...form, [field.toLowerCase()]: text })}
          />
        ))}
        
        {/* OR Separator */}
        <View className="flex-row items-center my-5">
          <View className="flex-1 h-[1px] bg-white opacity-50" />
          <Text className="text-center text-white text-lg opacity-80 mx-3 font-semibold">OR</Text>
          <View className="flex-1 h-[1px] bg-white opacity-50" />
        </View>

        {/* Google Sign-in Button */}
        <TouchableHighlight className="bg-white flex-row items-center justify-center p-3 mx-6 rounded-lg" underlayColor="#ddd">
          <>
            <Image source={require("@/assets/images/icon-google.png")} className="h-9 w-9 mr-2 top-1" />
            <Text className="text-[#1A4041] text-lg font-medium">Continue with Google</Text>
          </>
        </TouchableHighlight>
      </View>

      {/* Register Button */}
      <View className="mb-7">
        <TouchableHighlight
          className="bg-white px-10 py-3 rounded-lg mx-6 mt-4"
          underlayColor="#ddd"
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="large" className="h-8" color="#1A4041" />
          ) : (
            <Text className="text-2xl font-bold text-[#1A4041] text-center">Register</Text>
          )}
        </TouchableHighlight>
      </View>
    </View>
  );
};

export default Register;
