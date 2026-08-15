Feature: Manage the product catalog
  As an inventory administrator
  I want to create products and their supporting catalogs (categories, units)
  So that inventory, purchases and requests can operate on real products

  Scenario: Administrator creates a product referencing an existing unit
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "products" "create"
    And an existing unit "Kilogramo"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they create a product named "Arroz" using that unit
    Then the product is created successfully
    And the response includes the unit name "Kilogramo"

  Scenario: Administrator creates a new category
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "categories" "create"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they create a category named "Alimentos"
    Then the category is created successfully
    And the response includes the category name "Alimentos"

  Scenario: A user without the products:create permission cannot create a product
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" does not have permission "products" "create"
    And an existing unit "Kilogramo"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they attempt to create a product named "Hacker Product" using that unit
    Then they receive a forbidden error
