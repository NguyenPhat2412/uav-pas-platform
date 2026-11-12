package com.uav.platform.common.entity;

import java.io.Serializable;

/**
 * Common contract for any domain entity that possesses an identity.
 * Adheres to Object-Oriented Interface Segregation and Polymorphic contracts.
 */
public interface Identifiable<ID extends Serializable> {
    ID getId();
}
