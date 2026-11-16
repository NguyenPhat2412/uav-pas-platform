import React, {useMemo} from 'react';

/**
 * The small markdown subset training content uses (## / ### headings, - and 1. lists, | tables |,
 * **bold** and `code`). Everything is rendered as React text nodes: never raw HTML.
 */
function renderInlineFormatting(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return (
                <strong key={idx} className="font-semibold text-foreground">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return (
                <code
                    key={idx}
                    className="rounded-badge border border-border bg-surface-variant px-1.5 py-0.5 font-mono text-[12px] text-primary"
                >
                    {part.slice(1, -1)}
                </code>
            );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
}

export function MarkdownSopRenderer({markdown}: {markdown: string}) {
    const blocks = useMemo(() => {
        const lines = (markdown || '').split('\n');
        const result: Array<
            | {type: 'heading'; text: string}
            | {type: 'paragraph'; text: string}
            | {type: 'ul'; items: string[]}
            | {type: 'ol'; items: string[]}
            | {type: 'table'; headers: string[]; rows: string[][]}
        > = [];

        let i = 0;
        while (i < lines.length) {
            const raw = lines[i].trim();
            if (!raw) {
                i++;
                continue;
            }

            if (raw.startsWith('### ') || raw.startsWith('## ')) {
                result.push({
                    type: 'heading',
                    text: raw.replace(/^#{2,3}\s+/, ''),
                });
                i++;
                continue;
            }

            if (raw.startsWith('|') && raw.endsWith('|')) {
                const tableLines: string[] = [];
                while (i < lines.length && lines[i].trim().startsWith('|')) {
                    tableLines.push(lines[i].trim());
                    i++;
                }
                if (tableLines.length >= 2) {
                    const parseRow = (row: string) =>
                        row
                            .replace(/^\|/, '')
                            .replace(/\|$/, '')
                            .split('|')
                            .map((cell) => cell.trim());
                    const headers = parseRow(tableLines[0]);
                    const dataLines = tableLines.slice(1).filter((line) => !/^\|[\s\-:|]+\|$/.test(line));
                    const rows = dataLines.map(parseRow);
                    result.push({type: 'table', headers, rows});
                }
                continue;
            }

            if (raw.startsWith('- ') || raw.startsWith('* ')) {
                const items: string[] = [];
                while (
                    i < lines.length &&
                    (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))
                ) {
                    items.push(lines[i].trim().slice(2));
                    i++;
                }
                result.push({type: 'ul', items});
                continue;
            }

            if (/^\d+\.\s+/.test(raw)) {
                const items: string[] = [];
                while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
                    items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
                    i++;
                }
                result.push({type: 'ol', items});
                continue;
            }

            const paraLines: string[] = [];
            while (
                i < lines.length &&
                lines[i].trim() !== '' &&
                !lines[i].trim().startsWith('#') &&
                !lines[i].trim().startsWith('|') &&
                !lines[i].trim().startsWith('- ') &&
                !/^\d+\.\s+/.test(lines[i].trim())
            ) {
                paraLines.push(lines[i].trim());
                i++;
            }
            if (paraLines.length > 0) {
                result.push({type: 'paragraph', text: paraLines.join(' ')});
            } else {
                i++;
            }
        }
        return result;
    }, [markdown]);

    return (
        <div className="space-y-4 text-sm leading-relaxed text-muted">
            {blocks.map((block, index) => {
                if (block.type === 'heading') {
                    return (
                        <div
                            key={index}
                            className="border-l-2 border-primary bg-surface-variant/60 px-3.5 py-2 font-semibold text-foreground"
                        >
                            {block.text}
                        </div>
                    );
                }

                if (block.type === 'paragraph') {
                    return (
                        <p key={index} className="text-sm leading-relaxed text-muted">
                            {renderInlineFormatting(block.text)}
                        </p>
                    );
                }

                if (block.type === 'ul') {
                    return (
                        <ul key={index} className="space-y-2 pl-1">
                            {block.items.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2.5">
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-primary" />
                                    <span>{renderInlineFormatting(item)}</span>
                                </li>
                            ))}
                        </ul>
                    );
                }

                if (block.type === 'ol') {
                    return (
                        <ol key={index} className="space-y-2 pl-1">
                            {block.items.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2.5">
                                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-badge border border-border bg-surface-variant font-mono text-[11px] font-semibold text-foreground">
                                        {idx + 1}
                                    </span>
                                    <span className="pt-0.5">{renderInlineFormatting(item)}</span>
                                </li>
                            ))}
                        </ol>
                    );
                }

                if (block.type === 'table') {
                    return (
                        <div key={index} className="overflow-x-auto border border-border">
                            <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                    <tr className="border-b border-border bg-surface-variant">
                                        {block.headers.map((header, hIdx) => (
                                            <th
                                                key={hIdx}
                                                className="border-r border-border px-3.5 py-2.5 font-semibold tracking-wider text-foreground uppercase last:border-r-0"
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-card">
                                    {block.rows.map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-surface-variant/50">
                                            {row.map((cell, cIdx) => (
                                                <td
                                                    key={cIdx}
                                                    className="border-r border-border px-3.5 py-2.5 text-muted last:border-r-0"
                                                >
                                                    {renderInlineFormatting(cell)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}
