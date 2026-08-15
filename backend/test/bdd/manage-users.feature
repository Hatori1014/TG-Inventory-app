Feature: Manage users and their assigned role
  As an administrator
  I want to create users and assign them a role
  So that the system applies the right permissions from their next login

  Scenario: Administrator creates a user with a role, and that user can log in afterwards
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "users" "create"
    And an existing role "Comprador" with id "role-buyer"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they create a user named "New Buyer" with email "buyer@tg-group.local", password "buyer-password", and role id "role-buyer"
    Then the user is created successfully
    And the response includes the role name "Comprador"
    When they log in with email "buyer@tg-group.local" and password "buyer-password"
    Then they receive a valid access token
    And the response includes their role "Comprador"

  Scenario: Administrator edits an existing user's role
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "users" "update"
    And an existing role "Administrador" with id "role-admin"
    And an existing user "buyer@tg-group.local" with role "Comprador"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they update the user's role to id "role-admin"
    Then the user update is successful
    And the response includes the role name "Administrador"

  Scenario: A user without the users:create permission cannot create a user
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" does not have permission "users" "create"
    And an existing role "Comprador" with id "role-buyer"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they attempt to create a user named "Hacker" with email "hacker@tg-group.local", password "hacker-password", and role id "role-buyer"
    Then they receive a forbidden error

  Scenario: Creating a user with a non-existent role is rejected
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "users" "create"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they create a user named "New Buyer" with email "buyer@tg-group.local", password "buyer-password", and role id "does-not-exist"
    Then they receive a bad request error
