import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const source = await fs.readFile(new URL('../src/features/training/utils/course-helpers.ts', import.meta.url), 'utf8');
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

test('only YouTube and Vimeo links are accepted for external videos', () => {
    assert.equal(h.isSupportedVideoLink('https://youtu.be/abc'), true);
    assert.equal(h.isSupportedVideoLink('https://www.youtube.com/watch?v=abc'), true);
    assert.equal(h.isSupportedVideoLink('https://www.youtube-nocookie.com/embed/abc'), true);
    assert.equal(h.isSupportedVideoLink('https://vimeo.com/123'), true);
    assert.equal(h.isSupportedVideoLink('https://player.vimeo.com/video/123'), true);
    assert.equal(h.isSupportedVideoLink('https://evil.example/youtube.com'), false);
    assert.equal(h.isSupportedVideoLink('javascript:alert(1)'), false);
    assert.equal(h.isSupportedVideoLink('not a url'), false);
});

test('reordering moves one item and respaces sort orders', () => {
    assert.deepEqual(h.moveItem(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b']);
    const list = ['a', 'b'];
    assert.equal(h.moveItem(list, 0, 5), list);
    assert.deepEqual(h.respacedSortOrders(3), [10, 20, 30]);
});

test('PDF guides and lesson attachments follow the addendum limits', () => {
    assert.equal(h.trainingAssetError({type: 'application/pdf', size: 50_000_000}, 'pdf'), null);
    assert.equal(h.trainingAssetError({type: 'application/pdf', size: 50_000_001}, 'pdf'), 'size');
    assert.equal(h.trainingAssetError({type: 'image/png', size: 10}, 'pdf'), 'type');
    assert.equal(h.trainingAssetError({type: 'application/pdf', size: 40_000_000}, 'resource'), null);
    assert.equal(h.trainingAssetError({type: 'image/jpeg', size: 10_000_001}, 'resource'), 'size');
    assert.equal(h.trainingAssetError({type: 'application/zip', size: 10}, 'resource'), 'type');
    assert.equal(h.trainingAssetError({type: 'application/pdf', size: 10}, 'image'), 'type');
    assert.equal(h.resourceFileKind('application/pdf'), 'pdf');
    assert.equal(h.resourceFileKind('image/webp'), 'image');
    assert.equal(h.resourceFileKind(undefined), 'file');
    assert.equal(h.defaultResourceTitle('Checklist bay.pdf'), 'Checklist bay');
    assert.equal(h.defaultResourceTitle('.env'), '.env');
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
