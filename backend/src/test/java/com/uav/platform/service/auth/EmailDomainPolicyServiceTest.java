package com.uav.platform.service.auth;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.service.impl.auth.EmailDomainPolicyServiceImpl;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;

class EmailDomainPolicyServiceTest {

    private final EmailDomainPolicyService policy =
            new EmailDomainPolicyServiceImpl(
                    EmailDomainPolicyServiceImpl.DEFAULT_ALLOWED_DOMAINS, "");

    @Test
    void acceptsAllowedPopularAndEducationalDomainsCaseInsensitively() {
        for (String email :
                List.of(
                        "user@gmail.com",
                        "User.Name+tag@GMAIL.COM",
                        "pilot@outlook.com",
                        "pilot@hotmail.com",
                        "pilot@icloud.com",
                        "relay.abc123@privaterelay.appleid.com",
                        "pilot@yahoo.com",
                        "student@school.ac.vn",
                        "researcher@university.edu.vn",
                        "student@dept.university.edu.vn",
                        "faculty@hust.edu.vn",
                        "officer@caa.gov.vn",
                        "scholar@tokyo-u.ac.jp")) {
            assertDoesNotThrow(() -> policy.validateForAuth(email), email);
            assertTrue(policy.isAllowedForOutboundSmtp(email), email);
        }
    }

    @Test
    void blocksRfcReservedExampleTestInvalidAndDisposableDomainsAlways() {
        EmailDomainPolicyService wildcardPolicy = new EmailDomainPolicyServiceImpl("*", "");

        for (String bogus :
                List.of(
                        "wxtest112945@example.invalid",
                        "john@example.com",
                        "sub@mail.example.com",
                        "user@example.org",
                        "user@example.net",
                        "probe@example.test",
                        "dev@localhost",
                        "dev@macbook.local",
                        "seed@uav-platform.com",
                        "burner@mailinator.com",
                        "temp@yopmail.com",
                        "temp@10minutemail.com",
                        "temp@tempmail.com",
                        "temp@guerrillamail.com")) {
            SystemException e1 =
                    assertThrows(SystemException.class, () -> policy.validateForAuth(bogus), bogus);
            assertEquals(HttpStatus.BAD_REQUEST, e1.getStatus());
            assertEquals("REGISTER_EMAIL_DOMAIN_BLOCKED", e1.getCode());
            assertEquals("email", e1.getField());

            // Even if an operator sets APP_AUTH_ALLOWED_EMAIL_DOMAINS=*, RFC-reserved & disposable
            // domains stay blocked and never go out over SMTP.
            SystemException e2 =
                    assertThrows(
                            SystemException.class,
                            () -> wildcardPolicy.validateForAuth(bogus),
                            bogus);
            assertEquals("REGISTER_EMAIL_DOMAIN_BLOCKED", e2.getCode());
            assertFalse(wildcardPolicy.isAllowedForOutboundSmtp(bogus), bogus);
            assertTrue(EmailDomainPolicyService.isReservedOrDisposable(bogus), bogus);
        }
    }

    @Test
    void rejectsUnlistedAndLookalikeDomainsWithFieldPointer() {
        for (String unlisted :
                List.of(
                        "attacker@unknown-random-domain.xyz",
                        "spoof@fakegmail.com",
                        "spoof@gmail.com.evil.ru",
                        "spoof@not-edu.vn",
                        "spoof@school.ac.vn.attacker.org")) {
            SystemException ex =
                    assertThrows(
                            SystemException.class,
                            () -> policy.validateForAuth(unlisted),
                            unlisted);
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
            assertEquals("REGISTER_EMAIL_DOMAIN_NOT_ALLOWED", ex.getCode());
            assertEquals("email", ex.getField());
        }
    }

    @Test
    void existingAccountsOnUnlistedRealDomainsKeepResetAndLoginCodes() {
        // The allowlist only gates new sign-ups: a staff account on a company or Workspace domain
        // must still reset its password and receive login codes.
        for (String existing :
                List.of("nguyen@tathanhan.com", "ops@company.vn", "it@workspace.io")) {
            assertDoesNotThrow(() -> policy.validateForExistingAccount(existing), existing);
            assertTrue(policy.isAllowedForOutboundSmtp(existing), existing);
        }
        for (String bogus :
                List.of("x@example.com", "x@mailinator.com", "x@host.invalid", "bad@@x.com")) {
            assertThrows(
                    SystemException.class, () -> policy.validateForExistingAccount(bogus), bogus);
            assertFalse(policy.isAllowedForOutboundSmtp(bogus), bogus);
        }
        EmailDomainPolicyService custom = new EmailDomainPolicyServiceImpl("gmail.com", ".spam.vn");
        assertThrows(
                SystemException.class, () -> custom.validateForExistingAccount("a@bot.spam.vn"));
        assertFalse(custom.isAllowedForOutboundSmtp("a@bot.spam.vn"));
    }

    @Test
    void customBlockedDomainsOverrideAllowedDomains() {
        EmailDomainPolicyService custom =
                new EmailDomainPolicyServiceImpl(
                        "gmail.com,.partner.vn", "blocked.partner.vn,.spam.partner.vn");

        assertDoesNotThrow(() -> custom.validateForAuth("ops@partner.vn"));
        assertDoesNotThrow(() -> custom.validateForAuth("ops@hq.partner.vn"));

        SystemException blockedExact =
                assertThrows(
                        SystemException.class,
                        () -> custom.validateForAuth("ops@blocked.partner.vn"));
        assertEquals("REGISTER_EMAIL_DOMAIN_BLOCKED", blockedExact.getCode());

        SystemException blockedSub =
                assertThrows(
                        SystemException.class,
                        () -> custom.validateForAuth("ops@bot.spam.partner.vn"));
        assertEquals("REGISTER_EMAIL_DOMAIN_BLOCKED", blockedSub.getCode());
    }

    @Test
    void rejectsMalformedAddressesBeforeCheckingDomainLists() {
        for (String malformed :
                List.of(
                        "",
                        "   ",
                        "plainaddress",
                        "@gmail.com",
                        "user@",
                        "user@gmail",
                        "user..double@gmail.com",
                        ".leading@gmail.com",
                        "trailing.@gmail.com",
                        "two@at@gmail.com",
                        "has space@gmail.com")) {
            SystemException ex =
                    assertThrows(
                            SystemException.class,
                            () -> policy.validateForAuth(malformed),
                            malformed);
            assertEquals("REGISTER_EMAIL_INVALID", ex.getCode(), malformed);
            assertEquals("email", ex.getField());
            assertFalse(policy.isAllowedForOutboundSmtp(malformed), malformed);
        }
    }
}
