import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

interface DocumentLine {
  text: string;
  emphasis?: boolean;
  /** Renders the line as a priced row with the amount right-aligned. */
  amount?: string;
  /** Smaller second line under a priced row, e.g. the leg's route. */
  detail?: string;
}

const styles = StyleSheet.create( {
  page: { backgroundColor: "#f7f4ed", color: "#1a1a18", fontFamily: "Helvetica", fontSize: 10, padding: 48 },
  brand: { color: "#c29e66", fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 24 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", marginBottom: 20 },
  line: { lineHeight: 1.55, marginBottom: 3 },
  emphasis: { fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", justifyContent: "space-between", borderBottomColor: "#e6e1d6", borderBottomWidth: 1, paddingVertical: 5 },
  rowLabel: { flexGrow: 1, flexShrink: 1, paddingRight: 16 },
  rowDetail: { color: "#6d685f", fontSize: 9, marginTop: 2 },
  footer: { borderTopColor: "#d8d3c9", borderTopWidth: 1, color: "#6d685f", fontSize: 9, marginTop: 22, paddingTop: 12 },
} );

export function GoldridrPdfDocument( { title, lines }: { title: string; lines: DocumentLine[] } ) {
  const footerIndex = lines.length > 1 && lines.at( -1 )?.text ? lines.length - 1 : -1;
  return (
    <Document>
      <Page size="A4" style={ styles.page }>
        <Text style={ styles.brand }>GoldRidr Chauffeur Services</Text>
        <Text style={ styles.title }>{ title }</Text>
        <View>
          { lines.map( ( line, index ) => line.amount !== undefined ? (
            <View key={ `${ index }-${ line.text }` } style={ styles.row } wrap={ false }>
              <View style={ styles.rowLabel }>
                <Text style={ line.emphasis ? styles.emphasis : {} }>{ line.text }</Text>
                { line.detail ? <Text style={ styles.rowDetail }>{ line.detail }</Text> : null }
              </View>
              <Text style={ line.emphasis ? styles.emphasis : {} }>{ line.amount }</Text>
            </View>
          ) : (
            <Text key={ `${ index }-${ line.text }` } style={ [ styles.line, line.emphasis ? styles.emphasis : {}, index === footerIndex ? styles.footer : {} ] }>
              { line.text || " " }
            </Text>
          ) ) }
        </View>
      </Page>
    </Document>
  );
}
