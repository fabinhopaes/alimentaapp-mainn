import React from "react";

import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const VERDE = "#006838";
const FUNDO = "#FFFCF6";

const DETALHES_EVENTO = [
  { titulo: "Data", descricao: "15 de novembro de 2026" },
  { titulo: "Horário", descricao: "A partir das 18hr" },
  { titulo: "Local", descricao: "Parque Max Feffer Suzano - SP" },
  { titulo: "Entrada", descricao: "1 kg de alimento não perecível" },
];

export default function TelaEventos({ navigation }) {
  const { width } = useWindowDimensions();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={[styles.tela, { width: Math.min(width, 460) }]}>
        <ScrollView
          contentContainerStyle={styles.conteudo}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topo}>
            <TouchableOpacity
              style={styles.voltar}
              onPress={() =>
                navigation.canGoBack()
                  ? navigation.goBack()
                  : navigation.navigate("Home")
              }
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Ionicons name="chevron-back" size={23} color={VERDE} />
            </TouchableOpacity>
            <Text style={styles.titulo}>Eventos</Text>
          </View>

          <Text style={styles.subtitulo}>
            Participe e ajude a transformar vidas através da música!
          </Text>

          <View
            style={styles.capa}
            accessibilityLabel="Show solidário com apresentação musical"
          >
            <Image
              source={require("../assets/images/tabIcons/luan santana.avif")}
              resizeMode="cover"
              style={StyleSheet.absoluteFill}
              accessibilityLabel="Luan Santana no palco"
            />
            <View style={styles.badgeEvento}>
              <Text style={styles.textoBadge}>EVENTO SOLIDÁRIO</Text>
            </View>
            <View style={styles.badgeArtista}>
              <Text style={styles.textoBadge}>LUAN SANTANA</Text>
            </View>
          </View>

          <View style={styles.card}>
            {DETALHES_EVENTO.map((item, index) => (
              <View
                key={`${item.titulo}-${index}`}
                style={[
                  styles.linhaDetalhe,
                  index === DETALHES_EVENTO.length - 1 &&
                    styles.ultimaLinha,
                ]}
              >
                <Text style={styles.rotulo}>{item.titulo}</Text>
                <Text style={styles.descricao}>{item.descricao}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.textoFinal}>
            O Show Comunitário do Alimenta+ une música e solidariedade para
            arrecadar alimentos e apoiar pessoas em vulnerabilidade no Alto
            Tietê.
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: FUNDO,
    alignItems: "center",
  },
  tela: {
    flex: 1,
    maxWidth: 460,
  },
  conteudo: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 26,
  },
  topo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  voltar: {
    width: 38,
    height: 38,
    borderRadius: 22,
    backgroundColor: "#E6F0DF",
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: {
    color: VERDE,
    fontFamily: "Poppins_700Bold",
    fontSize: 17,
  },
  subtitulo: {
    color: "#666666",
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  capa: {
    height: 138,
    marginHorizontal: 7,
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  badgeEvento: {
    position: "absolute",
    top: 10,
    left: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#E6F0DF",
  },
  badgeArtista: {
    position: "absolute",
    bottom: 8,
    left: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#E6F0DF",
  },
  textoBadge: {
    color: VERDE,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
  },
  card: {
    marginTop: 12,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8DDD6",
    backgroundColor: "#FFFFFF",
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 3,
  },
  linhaDetalhe: {
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#DDDDDD",
  },
  ultimaLinha: {
    borderBottomWidth: 0,
  },
  rotulo: {
    color: VERDE,
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
  },
  descricao: {
    color: "#666666",
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
  },
  textoFinal: {
    marginTop: 10,
    color: "#666666",
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
});
