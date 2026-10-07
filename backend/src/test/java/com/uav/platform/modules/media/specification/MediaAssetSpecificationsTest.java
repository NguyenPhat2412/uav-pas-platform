package com.uav.platform.modules.media.specification;

import com.uav.platform.modules.user.common.*;
import com.uav.platform.modules.uav.common.*;
import com.uav.platform.modules.station.common.*;
import com.uav.platform.modules.inventory.common.*;
import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.audit.common.*;
import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.media.common.*;

import com.uav.platform.modules.media.entity.MediaAsset;
import com.uav.platform.modules.media.common.MediaType;
import jakarta.persistence.criteria.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MediaAssetSpecifications Unit Tests")
class MediaAssetSpecificationsTest {

    @Mock
    private Root<MediaAsset> root;

    @Mock
    private CriteriaQuery<?> query;

    @Mock
    private CriteriaBuilder cb;

    @Mock
    private Path<String> originalNamePath;

    @Mock
    private Path<String> objectKeyPath;

    @Mock
    private Path<String> uploadedByPath;

    @Mock
    private Path<String> contentTypePath;

    @Mock
    private Path<MediaType> typePath;

    @Mock
    private Path<Boolean> confirmedPath;

    @Mock
    private Path<Boolean> deletedPath;

    @Mock
    private Path<String> linkedEntityTypePath;

    @Mock
    private Path<String> linkedEntityIdPath;

    @Mock
    private Path<LocalDateTime> createdAtPath;

    @Mock
    private Expression<String> lowerExpr;

    @Mock
    private Predicate predicate;

    @Test
    @DisplayName("empty or null keyword produces null predicate")
    void emptyOrNullKeywordProducesNullPredicate() {
        assertThat(MediaAssetSpecifications.hasKeyword(null).toPredicate(root, query, cb)).isNull();
        assertThat(MediaAssetSpecifications.hasKeyword("").toPredicate(root, query, cb)).isNull();
        assertThat(MediaAssetSpecifications.hasKeyword("   ").toPredicate(root, query, cb)).isNull();
    }

    @Test
    @DisplayName("hasKeyword builds case-insensitive or predicate")
    void hasKeyword_BuildsOrPredicate() {
        when(root.<String>get("originalName")).thenReturn(originalNamePath);
        when(root.<String>get("objectKey")).thenReturn(objectKeyPath);
        when(root.<String>get("uploadedBy")).thenReturn(uploadedByPath);

        when(cb.lower(any())).thenReturn(lowerExpr);
        when(cb.like(any(), anyString())).thenReturn(predicate);
        when(cb.or(any(Predicate[].class))).thenReturn(predicate);

        Specification<MediaAsset> spec = MediaAssetSpecifications.hasKeyword("flight_log");
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(predicate);
        verify(cb).or(any(Predicate[].class));
    }

    @Test
    @DisplayName("hasUploader null or blank produces null, non-empty builds equal predicate")
    void hasUploader_Tests() {
        assertThat(MediaAssetSpecifications.hasUploader(null).toPredicate(root, query, cb)).isNull();
        assertThat(MediaAssetSpecifications.hasUploader("  ").toPredicate(root, query, cb)).isNull();

        when(root.<String>get("uploadedBy")).thenReturn(uploadedByPath);
        when(cb.lower(uploadedByPath)).thenReturn(lowerExpr);
        when(cb.equal(lowerExpr, "pilot1")).thenReturn(predicate);

        Predicate result = MediaAssetSpecifications.hasUploader("pilot1").toPredicate(root, query, cb);
        assertThat(result).isSameAs(predicate);
    }

    @Test
    @DisplayName("hasType, hasContentType, isConfirmed, isDeleted tests")
    void statusAndType_Tests() {
        assertThat(MediaAssetSpecifications.hasType(null).toPredicate(root, query, cb)).isNull();
        assertThat(MediaAssetSpecifications.hasContentType(null).toPredicate(root, query, cb)).isNull();
        assertThat(MediaAssetSpecifications.hasContentType("   ").toPredicate(root, query, cb)).isNull();
        assertThat(MediaAssetSpecifications.isConfirmed(null).toPredicate(root, query, cb)).isNull();
        assertThat(MediaAssetSpecifications.isDeleted(null).toPredicate(root, query, cb)).isNull();

        when(root.<MediaType>get("type")).thenReturn(typePath);
        when(cb.equal(typePath, MediaType.IMAGE)).thenReturn(predicate);
        assertThat(MediaAssetSpecifications.hasType(MediaType.IMAGE).toPredicate(root, query, cb)).isSameAs(predicate);

        when(root.<String>get("contentType")).thenReturn(contentTypePath);
        when(cb.lower(contentTypePath)).thenReturn(lowerExpr);
        when(cb.equal(lowerExpr, "image/jpeg")).thenReturn(predicate);
        assertThat(MediaAssetSpecifications.hasContentType("image/jpeg").toPredicate(root, query, cb)).isSameAs(predicate);

        when(root.<Boolean>get("confirmed")).thenReturn(confirmedPath);
        when(cb.equal(confirmedPath, true)).thenReturn(predicate);
        assertThat(MediaAssetSpecifications.isConfirmed(true).toPredicate(root, query, cb)).isSameAs(predicate);

        when(root.<Boolean>get("deleted")).thenReturn(deletedPath);
        when(cb.equal(deletedPath, false)).thenReturn(predicate);
        assertThat(MediaAssetSpecifications.isDeleted(false).toPredicate(root, query, cb)).isSameAs(predicate);
    }

    @Test
    @DisplayName("hasLinkedEntity tests for type, id, and both")
    void hasLinkedEntity_Tests() {
        assertThat(MediaAssetSpecifications.hasLinkedEntity(null, null).toPredicate(root, query, cb)).isNull();
        assertThat(MediaAssetSpecifications.hasLinkedEntity("  ", " ").toPredicate(root, query, cb)).isNull();

        // Type only
        when(root.<String>get("linkedEntityType")).thenReturn(linkedEntityTypePath);
        when(cb.lower(linkedEntityTypePath)).thenReturn(lowerExpr);
        when(cb.equal(lowerExpr, "mission")).thenReturn(predicate);
        assertThat(MediaAssetSpecifications.hasLinkedEntity("MISSION", null).toPredicate(root, query, cb)).isSameAs(predicate);

        // ID only
        when(root.<String>get("linkedEntityId")).thenReturn(linkedEntityIdPath);
        when(cb.equal(linkedEntityIdPath, "100")).thenReturn(predicate);
        assertThat(MediaAssetSpecifications.hasLinkedEntity(null, "100").toPredicate(root, query, cb)).isSameAs(predicate);

        // Both
        when(cb.and(any(Predicate.class), any(Predicate.class))).thenReturn(predicate);
        assertThat(MediaAssetSpecifications.hasLinkedEntity("MISSION", "100").toPredicate(root, query, cb)).isSameAs(predicate);
    }

    @Test
    @DisplayName("createdBetween null bounds produce null, bounds build predicate")
    void createdBetween_Tests() {
        assertThat(MediaAssetSpecifications.createdBetween(null, null).toPredicate(root, query, cb)).isNull();

        LocalDateTime now = LocalDateTime.now();
        when(root.<LocalDateTime>get("createdAt")).thenReturn(createdAtPath);
        when(cb.greaterThanOrEqualTo(createdAtPath, now.minusDays(1))).thenReturn(predicate);
        when(cb.lessThanOrEqualTo(createdAtPath, now)).thenReturn(predicate);
        when(cb.and(any(Predicate.class), any(Predicate.class))).thenReturn(predicate);

        Predicate result = MediaAssetSpecifications.createdBetween(now.minusDays(1), now).toPredicate(root, query, cb);
        assertThat(result).isSameAs(predicate);
    }

    @Test
    @DisplayName("filter composite specification combines null-safe criteria")
    void filter_Composite_Tests() {
        Specification<MediaAsset> spec = MediaAssetSpecifications.filter(null, null, null, null);
        assertThat(spec.toPredicate(root, query, cb)).isNull();
    }
}
