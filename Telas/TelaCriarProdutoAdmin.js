import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  deleteField,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth } from "../firebase";
import { db } from "../firebaseDb";
import {
  CATEGORIAS_PRODUTO,
  UNIDADES_PRODUTO,
  erroValidacaoProduto,
  montarAlteracoesProdutoAdmin,
  montarDadosProdutoAdmin,
  precoParaNumero,
} from "../utils/produtosAdmin";

const VERDE = "#006838";
const FUNDO = "#FFFCF6";

function Campo({ label, ...props }) {
  return (
    <>
      <Text style={styles.rotulo}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, props.multiline && styles.descricao]}
        placeholderTextColor="#999999"
      />
    </>
  );
}

export default function TelaCriarProdutoAdmin({ navigation, route }) {
  const { width } = useWindowDimensions();
  const produtoInicial = route.params?.produto || null;
  const editando = Boolean(produtoInicial?.id);
  const precoInicial =
    produtoInicial?.precoAtual ?? precoParaNumero(produtoInicial?.preco);
  const [nome, setNome] = useState(produtoInicial?.nome || "");
  const [descricao, setDescricao] = useState(produtoInicial?.descricao || "");
  const [categoria, setCategoria] = useState(produtoInicial?.categoria || "");
  const [quantidade, setQuantidade] = useState(
    String(produtoInicial?.quantidade ?? "")
  );
  const [unidade, setUnidade] = useState(produtoInicial?.unidade || "");
  const [preco, setPreco] = useState(
    Number.isFinite(precoInicial) ? String(precoInicial).replace(".", ",") : ""
  );
  const [imagemUrl, setImagemUrl] = useState(
    produtoInicial?.imagemAdminDefinida === true
      ? produtoInicial?.imagemUrl || ""
      : ""
  );
  const [imagemFalhou, setImagemFalhou] = useState(false);
  const [abrirCategorias, setAbrirCategorias] = useState(false);
  const [abrirUnidades, setAbrirUnidades] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (salvando) return;
    setErro("");

    const campos = { nome, descricao, categoria, quantidade, unidade, preco, imagemUrl };
    const erroFormulario = erroValidacaoProduto(campos, {
      permitirEstoqueZerado: editando,
      permitirCamposLegadosVazios: editando,
    });
    if (erroFormulario) {
      setErro(erroFormulario);
      return;
    }
    if (imagemUrl.trim() && imagemFalhou) {
      setErro("Não foi possível carregar a imagem. Use um link HTTPS público e direto.");
      return;
    }

    const usuario = auth.currentUser;
    if (!usuario) {
      setErro("Sua sessão expirou. Entre novamente para continuar.");
      return;
    }

    setSalvando(true);
    try {
      const token = await usuario.getIdTokenResult(true);
      if (token?.claims?.admin !== true) {
        throw new Error("Sua conta não possui permissão administrativa.");
      }

      if (editando) {
        await updateDoc(doc(db, "alimentos", produtoInicial.id), {
          ...montarAlteracoesProdutoAdmin({
            produto: produtoInicial,
            ...campos,
            atualizadoEm: serverTimestamp(),
          }),
          imagem: deleteField(),
          image: deleteField(),
          imageUrl: deleteField(),
          foto: deleteField(),
          fotoUrl: deleteField(),
          fotoURL: deleteField(),
          photoUrl: deleteField(),
          photoURL: deleteField(),
          urlImagem: deleteField(),
          urlFoto: deleteField(),
        });
      } else {
        const registro = montarDadosProdutoAdmin({
          ...campos,
          status: "disponivel",
          criadoPor: usuario.uid,
          criadoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp(),
        });
        await addDoc(collection(db, "alimentos"), registro);
      }

      Alert.alert(
        editando ? "Produto atualizado" : "Produto criado",
        editando
          ? "As alterações foram salvas."
          : "O produto já está disponível no catálogo dos usuários."
      );
      navigation.goBack();
    } catch (e) {
      console.error("Erro ao salvar produto:", e);
      setErro(
        e.code === "permission-denied"
          ? "Acesso negado. Publique as regras atualizadas do Firestore e confira a permissão administrativa."
          : e.message || "Não foi possível salvar o produto."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={[styles.painel, { width: Math.min(width, 460) }]}>
        <ScrollView
          contentContainerStyle={styles.conteudo}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topo}>
            <TouchableOpacity style={styles.voltar} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={25} color={VERDE} />
            </TouchableOpacity>
            <Text style={styles.titulo}>
              {editando ? "Editar Produto" : "Criar produto"}
            </Text>
          </View>
          <Text style={styles.subtitulo}>
            {editando
              ? "Atualize as informações do produto."
              : "Preencha as informações para cadastrar um novo produto."}
          </Text>

          <View style={styles.imagemArea}>
            <View style={styles.imagemCaixa}>
              {imagemUrl.trim() && !imagemFalhou ? (
                <Image
                  key={imagemUrl}
                  source={{ uri: imagemUrl.trim() }}
                  resizeMode="contain"
                  style={styles.imagem}
                  onError={() => setImagemFalhou(true)}
                />
              ) : (
                <View style={styles.imagemVazia}>
                  <Ionicons name="image-outline" size={37} color={VERDE} />
                </View>
              )}
              <View style={styles.infoImagem}>
                <Text style={styles.adicionar}>Imagem por link</Text>
                <Text style={styles.ajudaImagem}>
                  Use um link HTTPS público e direto para a imagem.
                </Text>
              </View>
            </View>
            <TextInput
              style={[styles.input, styles.linkImagem]}
              placeholder="https://exemplo.com/imagem.jpg"
              value={imagemUrl}
              onChangeText={(valor) => {
                setImagemUrl(valor);
                setImagemFalhou(false);
                setErro("");
              }}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={2048}
              accessibilityLabel="Link HTTPS público da imagem do produto"
            />
            {imagemUrl.trim() && imagemFalhou && (
              <Text style={styles.erroImagem}>
                Não foi possível carregar a prévia. Confira se o link abre uma imagem pública.
              </Text>
            )}
          </View>

          <Campo
            label="Nome do produto"
            placeholder="Digite o nome do produto"
            value={nome}
            onChangeText={setNome}
            maxLength={100}
          />
          <Campo
            label="Descrição"
            placeholder="Descreva o produto"
            value={descricao}
            onChangeText={setDescricao}
            maxLength={300}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.rotulo}>Categoria</Text>
          <TouchableOpacity
            style={styles.seletor}
            onPress={() => setAbrirCategorias(!abrirCategorias)}
          >
            <Text style={{ color: categoria ? "#333333" : "#999999", fontSize: 12 }}>
              {categoria || "Selecione uma categoria"}
            </Text>
            <Ionicons name="chevron-down" size={19} />
          </TouchableOpacity>
          {abrirCategorias && CATEGORIAS_PRODUTO.map((item) => (
            <TouchableOpacity
              key={item}
              style={styles.opcao}
              onPress={() => {
                setCategoria(item);
                setAbrirCategorias(false);
              }}
            >
              <Text>{item}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.linhaCampos}>
            <View style={styles.coluna}>
              <Campo
                label="Quantidade em estoque"
                placeholder="Ex.: 10"
                value={quantidade}
                onChangeText={setQuantidade}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
            <View style={styles.coluna}>
              <Text style={styles.rotulo}>Unidade</Text>
              <TouchableOpacity
                style={styles.seletor}
                onPress={() => setAbrirUnidades(!abrirUnidades)}
              >
                <Text style={{ color: unidade ? "#333333" : "#999999", fontSize: 12 }}>
                  {unidade || "Selecione"}
                </Text>
                <Ionicons name="chevron-down" size={19} />
              </TouchableOpacity>
            </View>
          </View>
          {abrirUnidades && UNIDADES_PRODUTO.map((item) => (
            <TouchableOpacity
              key={item}
              style={styles.opcao}
              onPress={() => {
                setUnidade(item);
                setAbrirUnidades(false);
              }}
            >
              <Text>{item}</Text>
            </TouchableOpacity>
          ))}

          <Campo
            label="Preço por unidade"
            placeholder="R$ 0,00"
            value={preco}
            onChangeText={setPreco}
            keyboardType="decimal-pad"
          />

          {!!erro && <Text style={styles.erro}>{erro}</Text>}

          <View style={styles.botoes}>
            <TouchableOpacity
              style={styles.cancelar}
              onPress={() => navigation.goBack()}
              disabled={salvando}
            >
              <Text style={styles.cancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.salvar}
              onPress={salvar}
              disabled={salvando}
            >
              {salvando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.salvarTexto}>
                  {editando ? "Salvar produto" : "Criar produto"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: FUNDO, alignItems: "center" },
  painel: { flex: 1, maxWidth: 460 },
  conteudo: { padding: 17, paddingBottom: 42 },
  topo: { flexDirection: "row", alignItems: "center", gap: 10 },
  voltar: {
    height: 37, width: 37, borderRadius: 20, backgroundColor: "#E8EEE0",
    justifyContent: "center", alignItems: "center",
  },
  titulo: { fontFamily: "Poppins_700Bold", fontSize: 20, color: VERDE },
  subtitulo: {
    fontFamily: "Poppins_400Regular", fontSize: 15, lineHeight: 22,
    color: "#777777", marginTop: 10, marginBottom: 14,
  },
  imagemArea: { marginBottom: 12 },
  imagemCaixa: {
    width: "100%", backgroundColor: "#E6E6E0", minHeight: 100,
    borderRadius: 8, flexDirection: "row", gap: 10, alignItems: "center",
    justifyContent: "center", paddingHorizontal: 10,
  },
  imagem: { height: 80, width: 80, borderRadius: 7 },
  imagemVazia: { height: 80, width: 80, alignItems: "center", justifyContent: "center" },
  infoImagem: { flex: 1, minWidth: 0 },
  adicionar: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: VERDE },
  ajudaImagem: { fontSize: 10, color: "#555555" },
  linkImagem: { marginTop: 10 },
  erroImagem: { fontSize: 11, color: "#B3261E", marginTop: 6 },
  rotulo: {
    fontFamily: "Poppins_700Bold", fontSize: 12, color: "#111111",
    marginTop: 11, marginBottom: 7,
  },
  input: {
    minHeight: 45, paddingHorizontal: 12, borderWidth: 1, borderColor: "#D9DED5",
    borderRadius: 8, backgroundColor: "#FFFFFF", fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },
  descricao: { minHeight: 83, paddingTop: 12 },
  seletor: {
    height: 45, paddingHorizontal: 12, borderWidth: 1, borderColor: "#D9DED5",
    borderRadius: 8, backgroundColor: "#FFFFFF", flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
  },
  opcao: { padding: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EEEEEE" },
  linhaCampos: { flexDirection: "row", gap: 12 },
  coluna: { flex: 1, minWidth: 0 },
  erro: { fontSize: 12, color: "#B3261E", textAlign: "center", marginTop: 12 },
  botoes: { flexDirection: "row", gap: 12, marginTop: 30 },
  cancelar: {
    flex: 1, height: 48, borderRadius: 8, borderColor: VERDE, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  salvar: {
    flex: 1, height: 48, borderRadius: 8, backgroundColor: "#3D9924",
    alignItems: "center", justifyContent: "center",
  },
  cancelarTexto: { fontSize: 12, fontFamily: "Poppins_600SemiBold" },
  salvarTexto: { color: "#FFFFFF", fontSize: 12, fontFamily: "Poppins_600SemiBold" },
});
