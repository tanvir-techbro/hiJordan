import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  KeyboardAvoidingView,
  KeyboardProvider as KeyboardControllerProvider,
} from "react-native-keyboard-controller";

export function KeyboardProvider({ children }: { children: ReactNode }) {
  return (
    <KeyboardControllerProvider>{children}</KeyboardControllerProvider>
  );
}

export function KeyboardAvoider({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <KeyboardAvoidingView behavior="padding" style={style}>
      {children}
    </KeyboardAvoidingView>
  );
}
