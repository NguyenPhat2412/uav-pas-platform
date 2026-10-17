"""CI failure-path regressions. All subprocesses and sockets are mocked."""
import contextlib
import io
import json
import os
from pathlib import Path
import runpy
import shutil
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[4]
SOURCE = ROOT / 'backend/infra/ci'


class FailurePaths(unittest.TestCase):
    def setUp(self):
        workspace = ROOT / 'docs/work/ci-mock-tests'
        workspace.mkdir(parents=True, exist_ok=True)
        self.temporary = tempfile.TemporaryDirectory(dir=workspace)
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source = self.root / 'backend/infra/ci'
        self.source.mkdir(parents=True)
        previous_umask = os.umask(0o077)
        self.addCleanup(os.umask, previous_umask)

    def backend_gate(self, counts, maven_exit=0):
        script = self.source / 'backend_tests.py'
        shutil.copy2(SOURCE / script.name, script)
        reports = self.root / 'backend/target/surefire-reports'
        reports.mkdir(parents=True)
        if counts is not None:
            attributes = ' '.join(f'{key}="{value}"' for key, value in counts.items())
            (reports / 'TEST-synthetic.xml').write_text(f'<testsuite {attributes}/>')
        with patch.object(subprocess, 'run', return_value=SimpleNamespace(returncode=maven_exit)) as invoked, contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(SystemExit) as exit_result:
                runpy.run_path(str(script), run_name='__main__')
        invoked.assert_called_once()
        self.assertEqual(invoked.call_args.args[0], ['./mvnw', '-B', 'verify'])
        summary = json.loads((self.root / 'docs/work/backend-test-safe/result.json').read_text())
        return exit_result.exception.code, summary

    def test_backend_skipped_suite_fails_even_when_maven_succeeds(self):
        code, summary = self.backend_gate(dict(tests=3, failures=0, errors=0, skipped=1))
        self.assertNotEqual(code, 0)
        self.assertIn('TESTS_SKIPPED', summary['failureReasons'])
        self.assertEqual(summary['exitCode'], code)
        self.assertEqual(summary['mavenExitCode'], 0)

    def test_backend_empty_suite_fails(self):
        code, summary = self.backend_gate(None)
        self.assertNotEqual(code, 0)
        self.assertIn('NO_TESTS_EXECUTED', summary['failureReasons'])

    def test_backend_xml_failure_fails_even_when_maven_succeeds(self):
        code, summary = self.backend_gate(dict(tests=2, failures=1, errors=0, skipped=0))
        self.assertNotEqual(code, 0)
        self.assertIn('TEST_FAILURES', summary['failureReasons'])

    def test_backend_xml_error_fails_even_when_maven_succeeds(self):
        code, summary = self.backend_gate(dict(tests=2, failures=0, errors=1, skipped=0))
        self.assertNotEqual(code, 0)
        self.assertIn('TEST_ERRORS', summary['failureReasons'])

    def test_backend_maven_failure_remains_failure(self):
        code, summary = self.backend_gate(dict(tests=2, failures=0, errors=0, skipped=0), maven_exit=7)
        self.assertEqual(code, 7)
        self.assertIn('MAVEN_FAILED', summary['failureReasons'])

    def test_backend_nonempty_zero_skip_success_passes(self):
        code, summary = self.backend_gate(dict(tests=2, failures=0, errors=0, skipped=0))
        self.assertEqual(code, 0)
        self.assertEqual(summary['failureReasons'], [])

    def runner_cleanup(self, cleanup_exit):
        script = self.source / 'run.py'
        shutil.copy2(SOURCE / script.name, script)
        private = self.root / 'private'
        safe = self.root / 'safe'
        invocations = []

        def fake_process(args, **kwargs):
            invocations.append(args)
            # Simulate setup failure after ownership is established, then cleanup.
            exit_code = cleanup_exit if 'down' in args else 1
            return SimpleNamespace(returncode=exit_code, communicate=lambda **kwargs: (None, None))

        argv = [str(script), '--project', 'uav-mocked-ci', '--work-dir', str(private), '--result-dir', str(safe)]
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'true'}, clear=True), patch.object(sys, 'argv', argv), patch('socket.socket'), patch('signal.signal'), patch('secrets.token_hex', return_value='synthetic-masked-value'), patch.object(subprocess, 'run', return_value=SimpleNamespace(returncode=0, stdout=b'', stderr=b'')), patch.object(subprocess, 'Popen', side_effect=fake_process), contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(SystemExit) as exit_result:
                runpy.run_path(str(script), run_name='__main__')
        self.assertNotEqual(exit_result.exception.code, 0)  # Setup failure stays red.
        self.assertEqual(len(invocations), 2)
        self.assertIn('up', invocations[0])
        self.assertIn('down', invocations[1])
        self.assertTrue(all(args[:2] == ['docker', 'compose'] for args in invocations))
        return private, safe, json.loads((safe / 'runner.json').read_text())

    def test_failed_cleanup_preserves_fallback_ownership_and_private_material(self):
        private, safe, summary = self.runner_cleanup(cleanup_exit=1)
        self.assertTrue((private / 'owns-resources').is_file())
        self.assertTrue((private / 'owner.json').is_file())
        self.assertTrue((private / 'command-2.log').is_file())
        self.assertEqual(summary['checks'][-1]['status'], 'FAIL')
        self.assertEqual(summary['status'], 'FAIL')
        self.assertEqual({item.name for item in safe.iterdir()}, {'runner.json'})

    def test_successful_cleanup_removes_private_directory(self):
        private, safe, summary = self.runner_cleanup(cleanup_exit=0)
        self.assertFalse(private.exists())
        self.assertEqual(summary['checks'][-1]['status'], 'PASS')
        self.assertEqual({item.name for item in safe.iterdir()}, {'runner.json'})


if __name__ == '__main__':
    unittest.main()
