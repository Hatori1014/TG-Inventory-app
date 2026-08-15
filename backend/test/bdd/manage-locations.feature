Feature: Manage locations
  As an inventory administrator
  I want to create locations/rooms and organize them in a hierarchy
  So that inventory can be tracked per physical place

  Scenario: Administrator creates a root location
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "locations" "create"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they create a location named "Sede Central"
    Then the location is created successfully
    And the response includes the location name "Sede Central"

  Scenario: Administrator creates a child location under an existing parent
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "locations" "create"
    And an existing location "Sede Central"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they create a location named "Bodega A" under that parent
    Then the location is created successfully
    And the response includes the location name "Bodega A"

  Scenario: Creating a location with a duplicate name under the same parent is rejected
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "locations" "create"
    And an existing location "Sede Central"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they create a location named "Sede Central"
    Then they receive a conflict error

  Scenario: A user without the locations:create permission cannot create a location
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" does not have permission "locations" "create"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they attempt to create a location named "Hacker Location"
    Then they receive a forbidden error

  Scenario: Administrator deactivates a location instead of deleting it
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "locations" "update"
    And an existing location "Sede Central"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they deactivate that location
    Then the location is updated successfully
    And the response shows the location as inactive
