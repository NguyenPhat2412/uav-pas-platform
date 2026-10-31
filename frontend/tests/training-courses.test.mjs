import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const source = await fs.readFile(new URL('../src/utils/training/course-helpers.ts', import.meta.url), 'utf8');
const compiled = ts.transpile(source, {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022});
const h = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const sections = [
    {title: 'Bắt đầu', lessons: [
        {id: 10, title: 'A', type: 'VIDEO', durationMinutes: 6, completed: true},
        {id: 11, title: 'B', type: 'SLIDES', durationMinutes: 4, completed: false},
    ]},
    {title: 'Thực hành', lessons: [
        {id: 12, title: 'C', type: 'ARTICLE', durationMinutes: 5, completed: false},
    ]},
];

test('slide moves clamp to the deck and never wrap', () => {
    assert.equal(h.slideIndexAfter(0, 12, 'next'), 1);
    assert.equal(h.slideIndexAfter(0, 12, 'prev'), 0);
    assert.equal(h.slideIndexAfter(11, 12, 'next'), 11);
    assert.equal(h.slideIndexAfter(4, 12, 'first'), 0);
    assert.equal(h.slideIndexAfter(4, 12, 'last'), 11);
    assert.equal(h.slideIndexAfter(4, 12, 99), 11);
    assert.equal(h.slideIndexAfter(4, 12, -3), 0);
    assert.equal(h.slideIndexAfter(3, 0, 'next'), 0);
    assert.equal(h.slideCounter(2, 12), '3/12');
    assert.equal(h.slideCounter(0, 0), '0/0');
    assert.equal(h.isLastSlide(11, 12), true);
    assert.equal(h.isLastSlide(10, 12), false);
    assert.equal(h.isLastSlide(0, 0), false);
});

test('video lessons complete at 90 % and resume unless near the end', () => {
    assert.equal(h.isVideoWatched(89, 100), false);
    assert.equal(h.isVideoWatched(90, 100), true);
    assert.equal(h.isVideoWatched(10, Number.NaN), false);
    assert.equal(h.resumePosition(42, 600), 42);
    assert.equal(h.resumePosition(598, 600), 0);
    assert.equal(h.resumePosition(0, 600), 0);
    assert.equal(h.isPositionSaveDue(1_000, 15_999), false);
    assert.equal(h.isPositionSaveDue(1_000, 16_000), true);
});

test('the lesson in the URL wins when it belongs to the course, else the first unfinished one', () => {
    assert.equal(h.parseLessonParam('12'), 12);
    assert.equal(h.parseLessonParam('12abc'), null);
    assert.equal(h.parseLessonParam('0'), null);
    assert.equal(h.parseLessonParam(null), null);
    assert.equal(h.pickStartLesson(sections, 12), 12);
    assert.equal(h.pickStartLesson(sections, 999), 11);
    assert.equal(h.pickStartLesson(sections, null), 11);
    assert.equal(h.pickStartLesson([], 10), null);
    assert.deepEqual(h.neighbourLessons(sections, 11), {prev: 10, next: 12});
    assert.deepEqual(h.neighbourLessons(sections, 10), {prev: null, next: 11});
    assert.equal(h.lessonHref('/customer/training', 'an toàn', 12), '/customer/training/an%20to%C3%A0n?lesson=12');
});

test('catalogue cards pick their call to action and search ignores accents', () => {
    assert.equal(h.courseCallToAction('NOT_STARTED', 0), 'start');
    assert.equal(h.courseCallToAction('IN_PROGRESS', 1), 'continue');
    assert.equal(h.courseCallToAction('COMPLETED', 4), 'done');
    const course = {title: 'Chuẩn bị bãi đáp', summary: 'Khảo sát hiện trường', code: 'TRN-CUST-01'};
    assert.equal(h.matchesCourseSearch(course, 'bai dap'), true);
    assert.equal(h.matchesCourseSearch(course, 'cust-01'), true);
    assert.equal(h.matchesCourseSearch(course, 'billing'), false);
    assert.equal(h.sumLessonMinutes(sections[0].lessons), 10);
});

test('uploads are checked against the contract limits before asking for a URL', () => {
    assert.equal(h.trainingAssetError({type: 'video/mp4', size: 500_000_000}, 'video'), null);
    assert.equal(h.trainingAssetError({type: 'video/mp4', size: 500_000_001}, 'video'), 'size');
    assert.equal(h.trainingAssetError({type: 'video/quicktime', size: 10}, 'video'), 'type');
    assert.equal(h.trainingAssetError({type: 'image/webp', size: 10_000_000}, 'image'), null);
    assert.equal(h.trainingAssetError({type: 'image/gif', size: 10}, 'image'), 'type');
    assert.equal(h.trainingAssetError({type: 'image/png', size: 0}, 'image'), 'size');
});

test('external video links match the server: watch?v=, youtu.be, m.youtube.com and vimeo.com/ID only', () => {
    const id = 'dQw4w9WgXcQ';
    assert.equal(h.isSupportedVideoLink(`https://youtu.be/${id}`), true);
    assert.equal(h.isSupportedVideoLink(`https://www.youtube.com/watch?v=${id}`), true);
    assert.equal(h.isSupportedVideoLink(`https://youtube.com/watch?v=${id}&t=30`), true);
    assert.equal(h.isSupportedVideoLink(`https://m.youtube.com/watch?v=${id}`), true);
    assert.equal(h.isSupportedVideoLink('https://vimeo.com/123456'), true);
    // What the server rejects is rejected here too.
    assert.equal(h.isSupportedVideoLink(`https://www.youtube-nocookie.com/embed/${id}`), false);
    assert.equal(h.isSupportedVideoLink('https://player.vimeo.com/video/123'), false);
    assert.equal(h.isSupportedVideoLink('https://www.youtube.com/playlist?list=PL123'), false);
    assert.equal(h.isSupportedVideoLink('https://www.youtube.com/@channel'), false);
    assert.equal(h.isSupportedVideoLink('https://www.youtube.com/watch?v=short'), false);
    assert.equal(h.isSupportedVideoLink(`https://youtu.be/${id}/extra`), false);
    assert.equal(h.isSupportedVideoLink('https://vimeo.com/about'), false);
    assert.equal(h.isSupportedVideoLink('https://www.vimeo.com/123'), false);
    assert.equal(h.isSupportedVideoLink(`https://user@youtu.be/${id}`), false);
    assert.equal(h.isSupportedVideoLink('https://evil.example/youtube.com'), false);
    assert.equal(h.isSupportedVideoLink('javascript:alert(1)'), false);
    assert.equal(h.isSupportedVideoLink('not a url'), false);
    // The player only frames the server's normalised embed URLs.
    assert.equal(h.isVideoEmbedUrl(`https://www.youtube-nocookie.com/embed/${id}`), true);
    assert.equal(h.isVideoEmbedUrl('https://player.vimeo.com/video/123?h=abcdef'), true);
    assert.equal(h.isVideoEmbedUrl(`http://www.youtube-nocookie.com/embed/${id}`), false);
    assert.equal(h.isVideoEmbedUrl('https://evil.example/embed/x'), false);
});

test('document links: Google Docs/Slides/Sheets and Drive files over https only', () => {
    // Google file ids are 20–200 characters, the same rule as the backend's TrainingDocumentUrls.
    const fileId = '1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789';
    assert.equal(h.isSupportedDocumentLink(`https://docs.google.com/document/d/${fileId}/edit`), true);
    assert.equal(h.isSupportedDocumentLink(`https://docs.google.com/presentation/d/${fileId}/edit#slide=id.p`), true);
    assert.equal(h.isSupportedDocumentLink(`https://docs.google.com/spreadsheets/d/${fileId}/edit?usp=sharing`), true);
    assert.equal(h.isSupportedDocumentLink(`https://drive.google.com/file/d/${fileId}/view`), true);
    assert.equal(h.isSupportedDocumentLink(`http://docs.google.com/document/d/${fileId}/edit`), false);
    assert.equal(h.isSupportedDocumentLink(`https://docs.google.com/forms/d/${fileId}`), false);
    assert.equal(h.isSupportedDocumentLink(`https://drive.google.com/drive/folders/${fileId}`), false);
    assert.equal(h.isSupportedDocumentLink('https://docs.google.com.evil.example/document/d/abc'), false);
    assert.equal(h.isSupportedDocumentLink('https://docs.google.com/document/d/abc123/edit'), false);
    assert.equal(h.isSupportedDocumentLink('https://example.com/file.pdf'), false);
    assert.equal(h.isSupportedDocumentLink('not a url'), false);
    assert.equal(h.isDocumentEmbedUrl('https://docs.google.com/document/d/abc/preview'), true);
    assert.equal(h.isDocumentEmbedUrl('https://drive.google.com/file/d/abc/preview'), true);
    assert.equal(h.isDocumentEmbedUrl('https://evil.example/preview'), false);
    assert.equal(h.isDocumentEmbedUrl('javascript:alert(1)'), false);
});

test('reordering moves one item and respaces sort orders', () => {
    assert.deepEqual(h.moveItem(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b']);
    const list = ['a', 'b'];
    assert.equal(h.moveItem(list, 0, 5), list);
    assert.deepEqual(h.respacedSortOrders(3), [10, 20, 30]);
});

test('PDF guides and lesson attachments follow the addendum limits', () => {
    const docx = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const pptx = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    const xlsx = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    assert.equal(h.trainingAssetError({type: 'application/pdf', size: 50_000_000}, 'pdf'), null);
    assert.equal(h.trainingAssetError({type: 'application/pdf', size: 50_000_001}, 'pdf'), 'size');
    assert.equal(h.trainingAssetError({type: 'image/png', size: 10}, 'pdf'), 'type');
    assert.equal(h.trainingAssetError({type: 'application/pdf', size: 40_000_000}, 'resource'), null);
    assert.equal(h.trainingAssetError({type: 'image/jpeg', size: 10_000_001}, 'resource'), 'size');
    assert.equal(h.trainingAssetError({type: 'application/zip', size: 10}, 'resource'), 'type');
    assert.equal(h.trainingAssetError({type: 'application/pdf', size: 10}, 'image'), 'type');
    // Office files: attachments only, up to 50 MB.
    assert.equal(h.trainingAssetError({type: docx, size: 50_000_000}, 'resource'), null);
    assert.equal(h.trainingAssetError({type: xlsx, size: 50_000_001}, 'resource'), 'size');
    assert.equal(h.trainingAssetError({type: pptx, size: 10}, 'pdf'), 'type');
    assert.equal(h.trainingAssetError({type: '', size: 10, name: 'Bảng kiểm.XLSX'}, 'resource'), null);
    assert.equal(h.trainingFileContentType({type: '', name: 'slides.pptx'}), pptx);
    assert.equal(h.trainingFileContentType({type: '', name: 'readme'}), '');
    assert.equal(h.resourceFileKind('application/pdf'), 'pdf');
    assert.equal(h.resourceFileKind(docx), 'word');
    assert.equal(h.resourceFileKind(pptx), 'slides');
    assert.equal(h.resourceFileKind(xlsx), 'sheet');
    assert.equal(h.resourceFileKind('image/webp'), 'image');
    assert.equal(h.resourceFileKind(undefined), 'file');
    assert.equal(h.defaultResourceTitle('Checklist bay.pdf'), 'Checklist bay');
    assert.equal(h.defaultResourceTitle('.env'), '.env');
});

test('dropped files become lessons: videos, PDFs, and the images together as one slide deck', () => {
    const file = (name, type, size = 1000) => ({name, type, size});
    const plan = h.planBulkLessons([
        file('Giới thiệu.mp4', 'video/mp4'),
        file('Quy trình 02.png', 'image/png'),
        file('Hướng dẫn bay.pdf', 'application/pdf'),
        file('Quy trình 10.png', 'image/png'),
        file('Quy trình 01.jpg', 'image/jpeg'),
        file('Checklist.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        file('notes.txt', 'text/plain'),
        file('huge.mp4', 'video/mp4', 500_000_001),
        file('Bản đồ.webm', ''),
    ]);
    assert.deepEqual(plan.lessons.map(lesson => [lesson.type, lesson.title, lesson.files.map(f => f.name)]), [
        ['VIDEO', 'Giới thiệu', ['Giới thiệu.mp4']],
        ['SLIDES', 'Quy trình', ['Quy trình 01.jpg', 'Quy trình 02.png', 'Quy trình 10.png']],
        ['DOCUMENT', 'Hướng dẫn bay', ['Hướng dẫn bay.pdf']],
        ['VIDEO', 'Bản đồ', ['Bản đồ.webm']],
    ]);
    assert.deepEqual(plan.rejected.map(entry => [entry.file.name, entry.reason]), [
        ['Checklist.docx', 'office'],
        ['notes.txt', 'type'],
        ['huge.mp4', 'size'],
    ]);
    assert.deepEqual(h.planBulkLessons([]), {lessons: [], rejected: []});
});

test('default titles come from file names without the extension', () => {
    assert.equal(h.defaultLessonTitle('An toàn bay.v2.mp4'), 'An toàn bay.v2');
    assert.equal(h.defaultLessonTitle('  Hướng dẫn.pdf '), 'Hướng dẫn');
    assert.equal(h.slidesLessonTitle(['slide-1.png', 'slide-2.png']), 'slide');
    assert.equal(h.slidesLessonTitle(['Sơ đồ.png']), 'Sơ đồ');
    assert.equal(h.slidesLessonTitle(['a.png', 'b.png']), 'a');
    assert.equal(h.slidesLessonTitle([]), 'Slide');
});

test('the PDF reader zooms in steps around fit width and keeps page numbers in range', () => {
    assert.equal(h.nextPdfZoom(1, 'in'), 1.25);
    assert.equal(h.nextPdfZoom(1, 'out'), 0.75);
    assert.equal(h.nextPdfZoom(3, 'in'), 3);
    assert.equal(h.nextPdfZoom(0.5, 'out'), 0.5);
    assert.equal(h.clampPdfPage('7', 12), 7);
    assert.equal(h.clampPdfPage('99', 12), 12);
    assert.equal(h.clampPdfPage(0, 12), 1);
    assert.equal(h.clampPdfPage('', 12), null);
    assert.equal(h.clampPdfPage(null, 12), null);
    assert.equal(h.clampPdfPage('abc', 12), null);
    assert.equal(h.clampPdfPage(3, 0), null);
});

test('file sizes read in decimal units and bad input prints nothing', () => {
    assert.equal(h.formatFileSize(12), '12 B');
    assert.equal(h.formatFileSize(123_456), '123 KB');
    assert.equal(h.formatFileSize(1_500_000), '1.5 MB');
    assert.equal(h.formatFileSize(50_000_000), '50 MB');
    assert.equal(h.formatFileSize(Number.NaN), '');
    assert.equal(h.formatFileSize(-1), '');
    assert.equal(h.formatFileSize(undefined), '');
});

test('the progress ring counts finished lessons across sections', () => {
    assert.deepEqual(h.courseLessonProgress(sections), {done: 1, total: 3, percent: 33});
    assert.deepEqual(h.courseLessonProgress([]), {done: 0, total: 0, percent: 0});
});
