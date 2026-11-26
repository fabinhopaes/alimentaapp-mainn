import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

import { SafeAreaView } from "../components/AreaSegura";
import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseDb";
import { filtrarCampanhas, imagemCampanha } from "../utils/campanhasAdmin";

const VERDE = "#006838";
const FUNDO = "#FFFCF6";

export default function TelaEventos({ navigation }) {
  const { width } = useWindowDimensions();
  const [campanhas, setCampanhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => onSnapshot(
    collection(db, "campanhas"),
    (snapshot) => {
      const lista = snapshot.docs.map((documento) => ({
        ...documento.data(),
        id: documento.id,
      }));

      setCampanhas(
        filtrarCampanhas(lista).filter(
          (campanha) => campanha.status === "Ativa"
        )
      );
      setCarregando(false);
      setErro("");
    },
    (falha) => {
      console.error("Erro ao carregar eventos e campanhas:", falha);
      setErro("Não foi possível carregar as iniciativas agora.");
      setCarregando(false);
    }
  ), []);

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
            Acompanhe as iniciativas ativas e veja como participar.
          </Text>

          {carregando && (
            <ActivityIndicator
              size="large"
              color={VERDE}
              style={styles.carregando}
            />
          )}

          {!!erro && <Text style={styles.estado}>{erro}</Text>}

          {!carregando && !erro && campanhas.length === 0 && (
            <Text style={styles.estado}>
              Não há iniciativas ativas no momento.
            </Text>
          )}

          {campanhas.map((campanha) => (
            <TouchableOpacity
              key={campanha.id}
              style={styles.campanha}
              onPress={() =>
                navigation.navigate("TelaDetalheCampanha", { campanha })
              }
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${campanha.nome}`}
            >
              {imagemCampanha(campanha) && (
                <Image
                  source={imagemCampanha(campanha)}
                  resizeMode="cover"
                  style={styles.imagemCampanha}
                />
              )}
              <View style={styles.dadosCampanha}>
                <Text style={styles.categoria}>{campanha.categoria}</Text>
                <Text style={styles.nomeCampanha} numberOfLines={2}>
                  {campanha.nome}
                </Text>
                <Text style={styles.descricaoCampanha} numberOfLines={3}>
                  {campanha.descricao}
                </Text>
                <Text style={styles.periodo}>
                  {campanha.inicio} a {campanha.termino}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={VERDE} />
            </TouchableOpacity>
          ))}
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
    padding: 20,
    paddingBottom: 32,
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
    fontSize: 22,
  },
  subtitulo: {
    color: "#666666",
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 6,
  },
  carregando: {
    marginTop: 32,
  },
  estado: {
    marginTop: 28,
    color: "#666666",
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  campanha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D8DDD6",
  },
  imagemCampanha: {
    width: 72,
    height: 72,
    borderRadius: 6,
    backgroundColor: "#F0F3ED",
  },
  dadosCampanha: {
    flex: 1,
  },
  categoria: {
    color: VERDE,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
  },
  nomeCampanha: {
    marginTop: 2,
    color: "#253226",
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
  },
  descricaoCampanha: {
    marginTop: 2,
    color: "#666666",
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  periodo: {
    marginTop: 4,
    color: "#58645A",
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
  },
});