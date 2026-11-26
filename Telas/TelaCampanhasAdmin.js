import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebaseDb";

import {
  FILTROS_CAMPANHA,
  filtrarCampanhas,
  imagemCampanha,
} from "../utils/campanhasAdmin";

const VERDE = "#006838";
const FUNDO = "#FFFCF6";

// ========================================
// CORES DOS STATUS
// ========================================

function coresStatus(status) {
  if (status === "Ativa") {
    return {
      fundo: "#A8E8B9",
      texto: "#157C43",
    };
  }

  if (status === "Pausada") {
    return {
      fundo: "#FFE0BD",
      texto: "#ED8221",
    };
  }

  return {
    fundo: "#DDDDDD",
    texto: "#444444",
  };
}

// ========================================
// GERENCIAMENTO DE CAMPANHAS
// ========================================

export default function TelaCampanhasAdmin({
  navigation,
}) {
  const { width } = useWindowDimensions();

  const [campanhas, setCampanhas] =
    useState([]);

  const [busca, setBusca] =
    useState("");

  const [filtro, setFiltro] =
    useState("Todas");

  const [
    abrirFiltros,
    setAbrirFiltros,
  ] = useState(false);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState("");

  // ======================================
  // CONSULTAR FIRESTORE
  // ======================================

  useEffect(() => {
    return onSnapshot(
      collection(db, "campanhas"),

      (snapshot) => {
        const carregadas = snapshot.docs.map(
          (documento) => ({
            id: documento.id,
            ...documento.data(),
          })
        );

        setCampanhas(filtrarCampanhas(carregadas));
        setCarregando(false);
        setErro("");
      },

      (e) => {
        setCarregando(false);

        setErro(
          e.code === "permission-denied"
            ? "Para salvar campanhas reais, publique as regras administrativas do Firestore."
            : "Não foi possível carregar as campanhas cadastradas."
        );
      }
    );
  }, []);

  const lista = useMemo(() => {
    return filtrarCampanhas(
      campanhas,
      busca,
      filtro
    );
  }, [campanhas, busca, filtro]);

  // ======================================
  // INTERFACE
  // ======================================

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "bottom"]}
    >
      <View
        style={[
          styles.painel,
          {
            width: Math.min(width, 460),
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.conteudo}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* CABEÇALHO */}

          <View style={styles.topo}>
            <TouchableOpacity
              onPress={() =>
                navigation.goBack()
              }
              style={styles.voltar}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={VERDE}
              />
            </TouchableOpacity>

            <Text style={styles.titulo}>
              Campanhas
            </Text>
          </View>

          <Text style={styles.subtitulo}>
            Gerencie todas as campanhas cadastradas.
          </Text>

          {/* BUSCA E FILTRO */}

          <View style={styles.ferramentas}>
            <View style={styles.busca}>
              <Ionicons
                name="search-outline"
                size={18}
                color="#888888"
              />

              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar campanha..."
                placeholderTextColor="#999999"
                style={styles.input}
              />
            </View>

            <TouchableOpacity
              style={styles.filtro}
              onPress={() =>
                setAbrirFiltros(!abrirFiltros)
              }
            >
              <Text style={styles.filtroTexto}>
                {filtro}
              </Text>

              <Ionicons
                name="chevron-down"
                size={18}
              />
            </TouchableOpacity>
          </View>

          {abrirFiltros && (
            <View style={styles.menuFiltro}>
              {FILTROS_CAMPANHA.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.itemFiltro}
                  onPress={() => {
                    setFiltro(item);
                    setAbrirFiltros(false);
                  }}
                >
                  <Text
                    style={{
                      color:
                        item === filtro
                          ? VERDE
                          : "#333333",
                    }}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* CARREGAMENTO */}

          {carregando && (
            <ActivityIndicator
              color={VERDE}
              style={{
                marginTop: 20,
              }}
            />
          )}

          {!!erro && (
            <Text style={styles.aviso}>
              {erro}
            </Text>
          )}

          {/* CAMPANHAS */}

          {lista.map((campanha) => {
            const cores = coresStatus(
              campanha.status
            );
            const imagem = imagemCampanha(campanha);

            return (
              <TouchableOpacity
                key={campanha.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate(
                    "TelaEditarCampanhaAdmin",
                    {
                      campanha,
                    }
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={
                  `Editar ${campanha.nome}`
                }
              >
                {imagem ? (
                  <Image
                    source={imagem}
                    style={styles.imagem}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[styles.imagem, styles.imagemVazia]}>
                    <Ionicons
                      name="image-outline"
                      size={28}
                      color={VERDE}
                    />
                  </View>
                )}

                <View style={styles.info}>
                  <Text
                    numberOfLines={2}
                    style={styles.nome}
                  >
                    {campanha.nome}
                  </Text>

                  <Text
                    numberOfLines={3}
                    style={styles.desc}
                  >
                    {campanha.descricao}
                  </Text>

                </View>

                <View
                  style={[
                    styles.status,
                    {
                      backgroundColor:
                        cores.fundo,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusTexto,
                      {
                        color: cores.texto,
                      },
                    ]}
                  >
                    {campanha.status ||
                      "Ativa"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {!carregando &&
            lista.length === 0 && (
              <Text style={styles.aviso}>
                Nenhuma campanha encontrada.
              </Text>
            )}

          {/* CRIAR CAMPANHA */}

          <TouchableOpacity
            style={styles.nova}
            onPress={() =>
              navigation.navigate(
                "TelaCriarCampanhaAdmin"
              )
            }
          >
            <Ionicons
              name="add"
              color="#FFFFFF"
              size={20}
            />

            <Text style={styles.novaTexto}>
              Nova Campanha
            </Text>
          </TouchableOpacity>

          <Text style={styles.observacao}>
            As campanhas e seus status são
            atualizados em tempo real na tela
            dos clientes.
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ========================================
// ESTILOS
// ========================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: FUNDO,
    alignItems: "center",
  },

  painel: {
    flex: 1,
    maxWidth: 460,
  },

  conteudo: {
    padding: 17,
    paddingBottom: 42,
  },

  topo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  voltar: {
    height: 38,
    width: 38,
    borderRadius: 19,
    backgroundColor: "#E8EEE0",
    justifyContent: "center",
    alignItems: "center",
  },

  titulo: {
    color: VERDE,
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
  },

  subtitulo: {
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    color: "#666666",
    lineHeight: 22,
    marginTop: 9,
    marginBottom: 12,
  },

  ferramentas: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 11,
  },

  busca: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    height: 43,
    alignItems: "center",
    paddingHorizontal: 10,
    flexDirection: "row",
    gap: 7,
  },

  input: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },

  filtro: {
    maxWidth: "32%",
    minWidth: 88,
    height: 43,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderColor: "#DDDDDD",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },

  filtroTexto: {
    fontSize: 11,
    flexShrink: 1,
  },

  menuFiltro: {
    borderColor: "#DDDDDD",
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginBottom: 10,
  },

  itemFiltro: {
    padding: 11,
    borderBottomWidth: 1,
    borderColor: "#EEEEEE",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E1E1",
    borderRadius: 10,
    padding: 7,
    minHeight: 95,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  imagem: {
    width: 92,
    height: 79,
    backgroundColor: "#F2F2EE",
    borderRadius: 7,
  },

  imagemVazia: {
    alignItems: "center",
    justifyContent: "center",
  },

  info: {
    flex: 1,
    minWidth: 0,
  },

  nome: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#222222",
  },

  desc: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    lineHeight: 15,
    color: "#444444",
  },

  status: {
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },

  statusTexto: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
  },

  nova: {
    marginTop: 16,
    backgroundColor: "#389A27",
    borderRadius: 8,
    minHeight: 48,
    alignSelf: "center",
    paddingHorizontal: 33,
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
    flexDirection: "row",
  },

  novaTexto: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },

  aviso: {
    fontSize: 12,
    color: "#B3261E",
    marginVertical: 12,
    textAlign: "center",
  },

  observacao: {
    fontSize: 10,
    color: "#777777",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 16,
  },
});