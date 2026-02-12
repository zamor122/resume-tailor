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

const MARGIN = 40;

const styles = StyleSheet.create({
  page: {
    padding: MARGIN,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.3,
    color: "#1a1a1a",
  },
  name: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    letterSpacing: 0.5,
    borderBottomWidth: 1.5,
    borderBottomColor: "#222",
    paddingBottom: 8,
  },
  section: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 6,
    color: "#333",
  },
  subsection: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 4,
    color: "#444",
  },
  paragraph: {
    marginBottom: 6,
  },
  bulletWrap: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 12,
  },
  bulletMark: {
    width: 14,
    marginRight: 6,
    fontFamily: "Helvetica",
  },
  bulletText: {
    flex: 1,
  },
});

interface ResumePdfDocumentProps {
  blocks: ResumeBlock[];
}

export default function ResumePdfDocument({ blocks }: ResumePdfDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {blocks.map((block, i) => {
          switch (block.type) {
            case "name":
              return (
                <Text key={i} style={styles.name} break={false}>
                  {block.text}
                </Text>
              );
            case "section":
              return (
                <Text key={i} style={styles.section} break={false}>
                  {block.text}
                </Text>
              );
            case "subsection":
              return (
                <Text key={i} style={styles.subsection} break={false}>
                  {block.text}
                </Text>
              );
            case "paragraph":
              return (
                <Text key={i} style={styles.paragraph}>
                  {block.text}
                </Text>
              );
            case "bullet":
              return (
                <View key={i} style={styles.bulletWrap}>
                  <Text style={styles.bulletMark}>•</Text>
                  <Text style={styles.bulletText}>{block.text}</Text>
                </View>
              );
            default:
              return null;
          }
        })}
      </Page>
    </Document>
  );
}
