import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
export const CARD_WIDTH    = (width - 48) / 2;
export const BANNER_WIDTH  = width - 32;
export const BANNER_HEIGHT = 180;

export const styles = StyleSheet.create({
  container:   { flex: 1 },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '500' },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  greetSmall: { fontSize: 12, marginBottom: 2 },
  greeting:   { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  cartBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, position: 'relative' },
  cartBadge: { position: 'absolute', top: -2, right: -2, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#FFF' },
  cartBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  searchSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  searchWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  filterBtn: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 3 },

  bannerCard: { height: BANNER_HEIGHT, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  bannerImage:   { width: '100%', height: '100%', position: 'absolute' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  bannerContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18 },
  promoTag: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8 },
  promoTagText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  bannerTitle:  { fontSize: 18, fontWeight: '800', color: '#fff', lineHeight: 24 },
  bannerSub:    { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  dotRow: { flexDirection: 'row', gap: 5, marginTop: 12, justifyContent: 'center', alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  seeAll:       { fontSize: 13, fontWeight: '600' },

  catScroll: { paddingHorizontal: 16, paddingBottom: 8, gap: 16 },
  catItem:   { alignItems: 'center', gap: 6 },
  catCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  catText:   { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  listContent: { paddingBottom: 120 },
  row:         { justifyContent: 'space-between', paddingHorizontal: 16 },

  card: { 
    width: CARD_WIDTH, 
    borderRadius: 20, 
    marginBottom: 16, 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)'
  },
  
  imageContainer: { 
    width: '100%', 
    height: CARD_WIDTH, 
    position: 'relative'
  },
  productImage: { 
    width: '100%', 
    height: '100%',
    resizeMode: 'cover'
  },
  
  cardTopRow: { 
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 10, 
    zIndex: 10
  },
  newBadge: { 
    backgroundColor: '#FF7043', 
    borderRadius: 8, 
    paddingHorizontal: 8, 
    paddingVertical: 4,
    shadowColor: '#FF7043',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  newBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  heartBtn: { 
    padding: 6, 
    backgroundColor: 'rgba(255,255,255,0.85)', 
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },

  soldOutOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.55)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  soldOutText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },

  cardInfo: { 
    padding: 12, 
    paddingTop: 10
  },
  cardPrice: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2, lineHeight: 18 },
  cardUnit: { fontSize: 11, marginBottom: 12, opacity: 0.7 },

  actionRow: { flexDirection: 'row', gap: 8 },
  buyBtn: { 
    flex: 4, 
    height: 36, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }
  },
  buyBtnText: { fontSize: 13, fontWeight: '800' },
  cartIconBtn: { 
    flex: 1, 
    height: 36, 
    borderRadius: 12, 
    borderWidth: 1.5, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  emptyWrapper: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySubtitle: { fontSize: 14 },
});