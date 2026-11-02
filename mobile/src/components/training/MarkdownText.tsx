import React, {Fragment} from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText, ScaledText} from '@/components/ui';
import {colors, font, radius, spacing} from '@/styles/tokens';

type Block =
    | { kind: 'heading'; text: string }
    | { kind: 'list'; ordered: boolean; items: string[] }
    | { kind: 'table'; rows: string[][] }
    | { kind: 'paragraph'; text: string };

const BULLET = /^[-*]\s+/;
const NUMBERED = /^\d+\.\s+/;

/** The same subset the web MarkdownSopRenderer reads: ##/### headings, bullet and numbered lists, pipe tables, paragraphs. */
function parse(markdown: string): Block[] {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const blocks: Block[] = [];
    let i = 0;
    while (i < lines.length) {
        const raw = lines[i].trim();
        if (!raw) {
            i += 1;
        } else if (/^#{1,6}\s/.test(raw)) {
            blocks.push({kind: 'heading', text: raw.replace(/^#+\s*/, '')});
            i += 1;
        } else if (raw.startsWith('|') && raw.endsWith('|')) {
            const rows: string[][] = [];
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                const line = lines[i].trim();
                if (!/^\|[\s\-:|]+\|$/.test(line)) rows.push(line.slice(1, -1).split('|').map(cell => cell.trim()));
                i += 1;
            }
            blocks.push({kind: 'table', rows});
        } else if (BULLET.test(raw) || NUMBERED.test(raw)) {
            const ordered = NUMBERED.test(raw);
            const pattern = ordered ? NUMBERED : BULLET;
            const items: string[] = [];
            while (i < lines.length && pattern.test(lines[i].trim())) {
                items.push(lines[i].trim().replace(pattern, ''));
                i += 1;
            }
            blocks.push({kind: 'list', ordered, items});
        } else {
            const text: string[] = [];
            while (i < lines.length) {
                const line = lines[i].trim();
                if (!line || /^#{1,6}\s/.test(line) || line.startsWith('|') || BULLET.test(line) || NUMBERED.test(line)) break;
                text.push(line);
                i += 1;
            }
            blocks.push({kind: 'paragraph', text: text.join(' ')});
        }
    }
    return blocks;
}

/** **bold** and `code` inside a line; everything else is plain text. */
function Inline({text}: { text: string }) {
    return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) return <ScaledText key={index} style={styles.bold}>{part.slice(2, -2)}</ScaledText>;
        if (part.startsWith('`') && part.endsWith('`')) return <ScaledText key={index} style={styles.code}>{part.slice(1, -1)}</ScaledText>;
        return <Fragment key={index}>{part}</Fragment>;
    });
}

export function MarkdownText({markdown}: { markdown: string }) {
    return (
        <View style={styles.body}>
            {parse(markdown).map((block, index) => {
                switch (block.kind) {
                    case 'heading':
                        return <AppText key={index} variant="title"><Inline text={block.text}/></AppText>;
                    case 'list':
                        return (
                            <View key={index} style={styles.list}>
                                {block.items.map((item, n) => (
                                    <View key={n} style={styles.item}>
                                        <AppText style={styles.marker}>{block.ordered ? `${n + 1}.` : '•'}</AppText>
                                        <AppText style={styles.flex}><Inline text={item}/></AppText>
                                    </View>
                                ))}
                            </View>
                        );
                    case 'table':
                        return (
                            <View key={index} style={styles.table}>
                                {block.rows.map((row, r) => (
                                    <View key={r} style={[styles.row, r > 0 && styles.rowDivider]}>
                                        {row.map((cell, c) => (
                                            <AppText key={c} variant="small" style={[styles.cell, r === 0 && styles.bold]}><Inline text={cell}/></AppText>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        );
                    default:
                        return <AppText key={index} style={styles.paragraph}><Inline text={block.text}/></AppText>;
                }
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    body: {gap: spacing.md},
    paragraph: {lineHeight: 22},
    list: {gap: spacing.xs},
    item: {flexDirection: 'row', gap: spacing.sm},
    marker: {minWidth: 18, color: colors.textSecondary},
    bold: {fontWeight: '700', color: colors.text},
    code: {fontFamily: 'Menlo', fontSize: font.small, backgroundColor: colors.slateLight},
    table: {borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.control, overflow: 'hidden'},
    row: {flexDirection: 'row'},
    rowDivider: {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border},
    cell: {flex: 1, padding: spacing.sm},
});
