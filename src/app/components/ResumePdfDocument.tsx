"use client";

import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ResumeBlock } from "@/app/utils/resumePdfStructure";
import type { PdfTemplateId } from "@/app/constants/pdfTemplates";

const MARGIN = 9;
const MARGIN_TIGHT = 6;

// --- Modern Hybrid (default) ---
const ACCENT_NAVY = "#2c5282";
const RULE_NAVY = "#333";
const stylesModernHybrid = StyleSheet.create({
  page: { padding: MARGIN, fontFamily: "Helvetica", fontSize: 11, lineHeight: 1.35, color: "#1a1a1a" },
  name: { fontSize: 24, fontFamily: "Helvetica-Bold", marginBottom: 4, letterSpacing: 0.5, borderBottomWidth: 2, borderBottomColor: ACCENT_NAVY, paddingBottom: 8, textAlign: "center" },
  contactLine: { fontSize: 10, textAlign: "center", marginBottom: 8, color: "#444" },
  sectionRow: { flexDirection: "row", marginTop: 16, marginBottom: 8, alignItems: "flex-start" },
  sectionAccentBar: { width: 3, height: 14, backgroundColor: ACCENT_NAVY, marginRight: 8, marginTop: 1 },
  sectionContent: { flex: 1 },
  section: { fontSize: 11, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, color: ACCENT_NAVY },
  sectionRule: { height: 2, backgroundColor: RULE_NAVY, marginTop: 4, alignSelf: "stretch" },
  subsection: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4, color: "#444" },
  paragraph: { marginBottom: 8 },
  priorExperienceLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2, flexWrap: "wrap" },
  priorExperienceLeft: { flex: 1, minWidth: 0 },
  priorExperienceRight: { fontFamily: "Helvetica" },
  bulletWrap: { flexDirection: "row", marginBottom: 4, paddingLeft: 14 },
  bulletMark: { width: 12, marginRight: 6, fontFamily: "Helvetica", color: RULE_NAVY },
  bulletText: { flex: 1 },
  skillsGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10, gap: 4 },
  skillsGridItem: { width: "33%", fontSize: 10, marginBottom: 2 },
  footer: { position: "absolute", bottom: MARGIN, left: MARGIN, right: MARGIN, flexDirection: "row", justifyContent: "center" },
  footerText: { fontSize: 9, color: "#666", fontFamily: "Helvetica" },
});

// --- Clean Reverse-Chronological ---
const SLATE = "#333";
const stylesCleanChronological = StyleSheet.create({
  page: { padding: MARGIN, fontFamily: "Helvetica", fontSize: 11, lineHeight: 1.35, color: "#111" },
  name: { fontSize: 24, fontFamily: "Helvetica-Bold", marginBottom: 6, letterSpacing: 0.5, borderBottomWidth: 2, borderBottomColor: "#111", paddingBottom: 8, textAlign: "left" },
  contactLine: { fontSize: 10, textAlign: "left", marginBottom: 12, color: SLATE, lineHeight: 1.4 },
  sectionRow: { flexDirection: "row", marginTop: 18, marginBottom: 8, alignItems: "flex-start" },
  sectionAccentBar: { width: 0, height: 0, marginRight: 0 },
  sectionContent: { flex: 1 },
  section: { fontSize: 11, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, color: "#111" },
  sectionRule: { height: 1, backgroundColor: SLATE, marginTop: 4, alignSelf: "stretch" },
  subsection: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4, color: "#333" },
  paragraph: { marginBottom: 8 },
  priorExperienceLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  priorExperienceLeft: { flex: 1 },
  priorExperienceRight: { fontFamily: "Helvetica" },
  bulletWrap: { flexDirection: "row", marginBottom: 4, paddingLeft: 14 },
  bulletMark: { width: 12, marginRight: 6, fontFamily: "Helvetica", color: "#111" },
  bulletText: { flex: 1 },
  skillsGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8, gap: 4 },
  skillsGridItem: { width: "33%", fontSize: 10, marginBottom: 2 },
  footer: { position: "absolute", bottom: MARGIN, left: MARGIN, right: MARGIN, flexDirection: "row", justifyContent: "center" },
  footerText: { fontSize: 9, color: "#666", fontFamily: "Helvetica" },
});

// --- Creative / Startup (sidebar + main) ---
const ACCENT_BLUE = "#0066cc";
const SIDEBAR_BG = "#f0f4f8";
const stylesCreativeStartup = StyleSheet.create({
  page: { padding: 0, fontFamily: "Helvetica", fontSize: 11, lineHeight: 1.35, color: "#1a1a1a" },
  mainRow: { flexDirection: "row", flex: 1 },
  sidebar: { width: "30%", backgroundColor: SIDEBAR_BG, padding: MARGIN, paddingRight: 12, minWidth: 0 },
  main: { width: "70%", padding: MARGIN, paddingLeft: 14, minWidth: 0 },
  name: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 6, letterSpacing: 0.5, color: "#111", textAlign: "left" },
  contactLine: { fontSize: 9, textAlign: "left", marginBottom: 10, color: "#333" },
  sectionRow: { flexDirection: "row", marginTop: 14, marginBottom: 6, alignItems: "flex-start" },
  sectionAccentBar: { width: 3, height: 14, backgroundColor: ACCENT_BLUE, marginRight: 8, marginTop: 1 },
  sectionContent: { flex: 1 },
  section: { fontSize: 11, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, color: ACCENT_BLUE },
  sectionRule: { height: 2, backgroundColor: "#333", marginTop: 4, alignSelf: "stretch" },
  subsection: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4, color: "#444" },
  paragraph: { marginBottom: 6 },
  priorExperienceLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  priorExperienceLeft: { flex: 1 },
  priorExperienceRight: { fontFamily: "Helvetica" },
  bulletWrap: { flexDirection: "row", marginBottom: 4, paddingLeft: 14 },
  bulletMark: { width: 12, marginRight: 6, fontFamily: "Helvetica", color: "#333" },
  bulletText: { flex: 1 },
  skillsGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8, gap: 4 },
  skillsGridItem: { width: "100%", fontSize: 9, marginBottom: 2 },
  footer: { position: "absolute", bottom: MARGIN, left: MARGIN, right: MARGIN, flexDirection: "row", justifyContent: "center" },
  footerText: { fontSize: 9, color: "#666", fontFamily: "Helvetica" },
});

// --- Functional (warm accent) ---
const ACCENT_WARM = "#722F37";
const stylesFunctional = StyleSheet.create({
  page: { padding: MARGIN, fontFamily: "Helvetica", fontSize: 11, lineHeight: 1.35, color: "#1a1a1a" },
  name: { fontSize: 24, fontFamily: "Helvetica-Bold", marginBottom: 4, letterSpacing: 0.5, borderBottomWidth: 2, borderBottomColor: ACCENT_WARM, paddingBottom: 8, textAlign: "center" },
  contactLine: { fontSize: 10, textAlign: "center", marginBottom: 8, color: "#444" },
  sectionRow: { flexDirection: "row", marginTop: 16, marginBottom: 8, alignItems: "flex-start" },
  sectionAccentBar: { width: 3, height: 14, backgroundColor: ACCENT_WARM, marginRight: 8, marginTop: 1 },
  sectionContent: { flex: 1 },
  section: { fontSize: 11, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, color: ACCENT_WARM },
  sectionRule: { height: 2, backgroundColor: "#444", marginTop: 4, alignSelf: "stretch" },
  subsection: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4, color: "#444" },
  paragraph: { marginBottom: 8 },
  priorExperienceLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  priorExperienceLeft: { flex: 1 },
  priorExperienceRight: { fontFamily: "Helvetica" },
  bulletWrap: { flexDirection: "row", marginBottom: 4, paddingLeft: 14 },
  bulletMark: { width: 12, marginRight: 6, fontFamily: "Helvetica", color: "#333" },
  bulletText: { flex: 1 },
  skillsGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10, gap: 4 },
  skillsGridItem: { width: "33%", fontSize: 10, marginBottom: 2 },
  footer: { position: "absolute", bottom: MARGIN, left: MARGIN, right: MARGIN, flexDirection: "row", justifyContent: "center" },
  footerText: { fontSize: 9, color: "#666", fontFamily: "Helvetica" },
});

// --- One-Pager (compact, monochrome) ---
const stylesOnePager = StyleSheet.create({
  page: { padding: 10, fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.28, color: "#111" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6, borderBottomWidth: 1, borderBottomColor: "#111", paddingBottom: 4 },
  nameCompact: { fontSize: 18, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  contactCompact: { fontSize: 9, color: "#333", maxWidth: "60%" },
  sectionRow: { flexDirection: "row", marginTop: 10, marginBottom: 5, alignItems: "flex-start" },
  sectionAccentBar: { width: 0, height: 0 },
  sectionContent: { flex: 1 },
  section: { fontSize: 10, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, color: "#111" },
  sectionRule: { height: 1, backgroundColor: "#111", marginTop: 2, alignSelf: "stretch" },
  subsection: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 2, color: "#333" },
  paragraph: { marginBottom: 5, fontSize: 10 },
  priorExperienceLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 },
  priorExperienceLeft: { flex: 1, fontSize: 10 },
  priorExperienceRight: { fontFamily: "Helvetica", fontSize: 10 },
  bulletWrap: { flexDirection: "row", marginBottom: 3, paddingLeft: 10 },
  bulletMark: { width: 8, marginRight: 4, fontFamily: "Helvetica", color: "#111", fontSize: 10 },
  bulletText: { flex: 1, fontSize: 10 },
  skillsGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 5 },
  skillsGridItem: { width: "33%", fontSize: 9, marginBottom: 1 },
  footer: { position: "absolute", bottom: 10, left: 10, right: 10, flexDirection: "row", justifyContent: "center" },
  footerText: { fontSize: 8, color: "#666", fontFamily: "Helvetica" },
});

type StandardPdfStyles = typeof stylesModernHybrid | typeof stylesCleanChronological | typeof stylesFunctional;
const STYLES_STANDARD: Record<"modern-hybrid" | "clean-chronological" | "functional", StandardPdfStyles> = {
  "modern-hybrid": stylesModernHybrid,
  "clean-chronological": stylesCleanChronological,
  functional: stylesFunctional,
};

function looksLikeContact(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("@") || t.includes("|") || t.includes("linkedin") || t.includes("github") || /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(text);
}

function isSkillsSection(title: string): boolean {
  const lower = title.toLowerCase();
  return lower === "skills" || lower === "technical skills" || lower === "core competencies" || lower === "technical competencies";
}

interface ResumePdfDocumentProps {
  blocks: ResumeBlock[];
  templateId?: PdfTemplateId;
}

export default function ResumePdfDocument({ blocks, templateId = "modern-hybrid" }: ResumePdfDocumentProps) {
  const isCreativeStartup = templateId === "creative-startup";
  const isOnePager = templateId === "one-pager";
  const styles: StandardPdfStyles | typeof stylesCreativeStartup | typeof stylesOnePager =
    isCreativeStartup ? stylesCreativeStartup
    : isOnePager ? stylesOnePager
    : (STYLES_STANDARD[templateId as keyof typeof STYLES_STANDARD] ?? stylesModernHybrid);
  const useSkillsGrid = templateId === "modern-hybrid" && blocks.some((b) => b.type === "section" && isSkillsSection(b.text));

  let lastSection = "";
  let contactBlockIndex = -1;
  let skillsSectionStart = -1;
  let skillsSectionEnd = -1;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === "name" && i + 1 < blocks.length && blocks[i + 1].type === "paragraph" && looksLikeContact(blocks[i + 1].text)) {
      contactBlockIndex = i + 1;
    }
    if (b.type === "section" && isSkillsSection(b.text)) {
      skillsSectionStart = i;
      let j = i + 1;
      while (j < blocks.length && blocks[j].type !== "section") {
        if (blocks[j].type === "bullet") j++;
        else break;
      }
      skillsSectionEnd = j;
    }
  }

  const renderBlock = (block: ResumeBlock, i: number, s: StandardPdfStyles | typeof stylesCreativeStartup | typeof stylesOnePager): React.ReactNode => {
    if (block.type === "section") lastSection = block.text;
    switch (block.type) {
      case "name":
        if (isOnePager && contactBlockIndex >= 0 && blocks[contactBlockIndex]) {
          return null;
        }
        return (
          <Text key={i} style={isOnePager ? (s as typeof stylesOnePager).nameCompact : (s as StandardPdfStyles).name} break={false}>
            {block.text}
          </Text>
        );
      case "paragraph":
        if (i === contactBlockIndex) {
          if (isOnePager) {
            const nameBlock = blocks.find((b) => b.type === "name");
            const onePagerStyles = s as typeof stylesOnePager;
            return (
              <View key={i} style={onePagerStyles.headerRow} wrap={false}>
                <Text style={onePagerStyles.nameCompact}>{nameBlock?.text ?? ""}</Text>
                <Text style={onePagerStyles.contactCompact}>{block.text}</Text>
              </View>
            );
          }
          return (
            <Text key={i} style={(s as StandardPdfStyles).contactLine} break={false}>
              {block.text}
            </Text>
          );
        }
        const isPriorExperience = lastSection.toLowerCase().includes("prior experience");
        const dash = " – ";
        const lastDash = block.text.lastIndexOf(dash);
        if (isPriorExperience && lastDash > 0) {
          const left = block.text.slice(0, lastDash).trim();
          const right = block.text.slice(lastDash + dash.length).trim();
          return (
            <View key={i} style={s.priorExperienceLine}>
              <Text style={s.priorExperienceLeft}>{left}</Text>
              <Text style={s.priorExperienceRight}>{right}</Text>
            </View>
          );
        }
        return (
          <Text key={i} style={s.paragraph}>
            {block.text}
          </Text>
        );
      case "section":
        return (
          <View key={i} style={s.sectionRow} wrap={false}>
            <View style={s.sectionAccentBar} />
            <View style={s.sectionContent}>
              <Text style={s.section} break={false}>
                {block.text}
              </Text>
              <View style={s.sectionRule} />
            </View>
          </View>
        );
      case "subsection":
        return (
          <Text key={i} style={s.subsection} break={false}>
            {block.text}
          </Text>
        );
      case "bullet":
        if (useSkillsGrid && i >= skillsSectionStart && i < skillsSectionEnd) {
          return (
            <Text key={i} style={s.skillsGridItem}>
              • {block.text}
            </Text>
          );
        }
        return (
          <View key={i} style={s.bulletWrap}>
            <Text style={s.bulletMark}>•</Text>
            <Text style={s.bulletText}>{block.text}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  if (isCreativeStartup) {
    const nameBlock = blocks.find((b) => b.type === "name");
    const contactBlock = contactBlockIndex >= 0 ? blocks[contactBlockIndex] : null;
    const skillsSectionIdx = blocks.findIndex((b) => b.type === "section" && isSkillsSection(b.text));
    let rightStartIndex = 0;
    if (nameBlock) rightStartIndex = Math.max(rightStartIndex, blocks.indexOf(nameBlock) + 1);
    if (contactBlockIndex >= 0) rightStartIndex = Math.max(rightStartIndex, contactBlockIndex + 1);
    if (skillsSectionIdx >= 0) {
      let k = skillsSectionIdx + 1;
      while (k < blocks.length && blocks[k].type === "bullet") k++;
      rightStartIndex = Math.max(rightStartIndex, k);
    }
    const rightBlocks = blocks.slice(rightStartIndex);

    const creativeStyles = styles as typeof stylesCreativeStartup;
    return (
      <Document>
        <Page size="A4" style={creativeStyles.page}>
          <View style={creativeStyles.mainRow}>
            <View style={creativeStyles.sidebar}>
              {nameBlock && <Text style={creativeStyles.name} break={false}>{nameBlock.text}</Text>}
              {contactBlock && contactBlock.type === "paragraph" && (
                <Text style={creativeStyles.contactLine} break={false}>{contactBlock.text}</Text>
              )}
              {skillsSectionIdx >= 0 && (() => {
                const skillBullets: ResumeBlock[] = [];
                let k = skillsSectionIdx + 1;
                while (k < blocks.length && blocks[k].type === "bullet") {
                  skillBullets.push(blocks[k]);
                  k++;
                }
                return (
                  <>
                    <Text style={creativeStyles.section} break={false}>{blocks[skillsSectionIdx].text}</Text>
                    {skillBullets.map((b, bi) => (
                      <Text key={bi} style={creativeStyles.skillsGridItem}>• {b.text}</Text>
                    ))}
                  </>
                );
              })()}
            </View>
            <View style={creativeStyles.main}>
              {rightBlocks.map((b, i) => {
                lastSection = b.type === "section" ? b.text : lastSection;
                return renderBlock(b, rightStartIndex + i, styles);
              })}
            </View>
          </View>
          <View fixed style={creativeStyles.footer}>
            <Text render={({ pageNumber, totalPages }) => (totalPages > 1 ? `${pageNumber} / ${totalPages}` : "")} style={creativeStyles.footerText} />
          </View>
        </Page>
      </Document>
    );
  }

  const pageStyles = styles as StandardPdfStyles | typeof stylesOnePager;
  return (
    <Document>
      <Page size="A4" style={pageStyles.page}>
        {blocks.map((block, i) => {
          if (useSkillsGrid && block.type === "section" && isSkillsSection(block.text)) {
            lastSection = block.text;
            const bullets: ResumeBlock[] = [];
            let j = i + 1;
            while (j < blocks.length && blocks[j].type === "bullet") {
              bullets.push(blocks[j]);
              j++;
            }
            return (
              <React.Fragment key={i}>
                <View style={pageStyles.sectionRow} wrap={false}>
                  <View style={pageStyles.sectionAccentBar} />
                  <View style={pageStyles.sectionContent}>
                    <Text style={pageStyles.section} break={false}>{block.text}</Text>
                    <View style={pageStyles.sectionRule} />
                  </View>
                </View>
                <View style={pageStyles.skillsGrid}>
                  {bullets.map((b, bi) => (
                    <Text key={bi} style={pageStyles.skillsGridItem}>• {b.text}</Text>
                  ))}
                </View>
              </React.Fragment>
            );
          }
          if (useSkillsGrid && block.type === "bullet" && i > skillsSectionStart && i < skillsSectionEnd) return null;
          return renderBlock(block, i, styles);
        })}
        <View fixed style={pageStyles.footer}>
          <Text render={({ pageNumber, totalPages }) => (totalPages > 1 ? `${pageNumber} / ${totalPages}` : "")} style={pageStyles.footerText} />
        </View>
      </Page>
    </Document>
  );
}
