import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ========================================
// ÁREA SEGURA (substitui o SafeAreaView)
// ========================================
//
// No APK Android, o componente nativo SafeAreaView do
// react-native-safe-area-context deixava o conteúdo das telas
// invisível (só o fundo aparecia). Esta versão usa uma View
// comum e aplica as margens do sistema com useSafeAreaInsets,
// que só depende do SafeAreaProvider do App.js.
//
// Aceita as mesmas props usadas no projeto: style e edges.

const TODAS = ["top", "right", "bottom", "left"];

const PROPRIEDADE = {
  top: "paddingTop",
  right: "paddingRight",
  bottom: "paddingBottom",
  left: "paddingLeft",
};

export function SafeAreaView({
  edges = TODAS,
  style,
  children,
  ...resto
}) {
  const insets = useSafeAreaInsets();
  const plano = StyleSheet.flatten(style) || {};

  // Soma a margem do sistema ao padding que a tela já tinha,
  // como o SafeAreaView original faz.
  const margens = {};

  for (const lado of edges) {
    const prop = PROPRIEDADE[lado];

    if (!prop) continue;

    const vertical = lado === "top" || lado === "bottom";
    const atual =
      plano[prop] ??
      (vertical ? plano.paddingVertical : plano.paddingHorizontal) ??
      plano.padding ??
      0;

    margens[prop] =
      (typeof atual === "number" ? atual : 0) + insets[lado];
  }

  return (
    <View style={[style, margens]} {...resto}>
      {children}
    </View>
  );
}

export default SafeAreaView;
