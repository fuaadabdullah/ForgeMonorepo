
package com.example;

import java.util.Objects;

public class Node {
    private final String name;

    public Node(String name) {
        if (name == null) {
            throw new IllegalArgumentException("Node name cannot be null.");
        }
        this.name = name;
    }

    public String getName() {
        return name;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Node node = (Node) obj;
        return name.equals(node.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name);
    }

    @Override
    public String toString() {
        return "Node{" +
                "name='" + name + "''" +
                '}';
    }
}
