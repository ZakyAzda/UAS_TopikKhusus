import { StyleSheet } from 'react-native';

export const checkoutStyles = StyleSheet.create({
  // ── Screen ──────────────────────────────────────────────────────────────────
  container: { flex: 1 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSpacer: { width: 36 },

  // ── ScrollView ───────────────────────────────────────────────────────────────
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120, gap: 16, paddingTop: 16 },

  // ── Section Card ─────────────────────────────────────────────────────────────
  sectionCard: {
    borderRadius: 20, padding: 20, gap: 14,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionActionText: { fontSize: 13, fontWeight: '700' },

  // ── Address ──────────────────────────────────────────────────────────────────
  addressCard: {
    borderRadius: 14, padding: 14, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  addressCardContent: { flex: 1 },
  addressCardLabel: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  addressCardDetail: { fontSize: 12, lineHeight: 18 },
  addressCardActions: { flexDirection: 'row', gap: 8 },

  selectedIndicator: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },

  addAddressBtn: {
    borderRadius: 14, padding: 14, borderWidth: 1.5,
    borderStyle: 'dashed', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  addAddressBtnText: { fontSize: 14, fontWeight: '700' },

  // ── Address Form (modal-like inline) ─────────────────────────────────────────
  formContainer: { gap: 12, marginTop: 4 },
  formRow: { flexDirection: 'row', gap: 10 },
  labelInput: {
    flex: 1, borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
  },
  detailInput: {
    borderRadius: 12, borderWidth: 1.5,
    padding: 14, fontSize: 14, lineHeight: 22, minHeight: 90,
  },
  formHint: { fontSize: 11, lineHeight: 17 },
  mapBtn: {
    borderRadius: 12, padding: 12, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  mapBtnText: { fontSize: 13, fontWeight: '700' },
  mapPickedRow: {
    borderRadius: 12, padding: 10, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  mapPickedText: { fontSize: 12, fontWeight: '600', flex: 1 },
  formBtnRow: { flexDirection: 'row', gap: 10 },
  formCancelBtn: {
    flex: 1, borderRadius: 12, padding: 13,
    alignItems: 'center', borderWidth: 1.5,
  },
  formCancelText: { fontSize: 14, fontWeight: '700' },
  formSaveBtn: {
    flex: 2, borderRadius: 12, padding: 13, alignItems: 'center',
  },
  formSaveText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // ── Map Preview ───────────────────────────────────────────────────────────────
  mapPreview: {
    width: '100%', height: 140, borderRadius: 14, overflow: 'hidden',
    marginTop: 4,
  },

  // ── Order Summary ─────────────────────────────────────────────────────────────
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '700' },
  summaryDivider: { height: 1, marginVertical: 10 },
  summaryTotalLabel: { fontSize: 15, fontWeight: '800' },
  summaryTotalValue: { fontSize: 18, fontWeight: '900' },

  // ── Payment ───────────────────────────────────────────────────────────────────
  payCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, padding: 14, borderWidth: 1.5,
  },
  payIcon: { fontSize: 24 },
  payLabel: { fontSize: 14, fontWeight: '700' },
  payDesc: { fontSize: 12, marginTop: 2 },
  payRadio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Info Box ──────────────────────────────────────────────────────────────────
  infoBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20 },

  // ── Bottom Bar ────────────────────────────────────────────────────────────────
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 32, borderTopWidth: 1,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 18, paddingVertical: 16,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});