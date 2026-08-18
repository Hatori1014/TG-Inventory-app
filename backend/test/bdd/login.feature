Feature: User login
  As a user
  I want to log in with my email and password
  So that I can access the system securely

  Scenario: Successful login
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    Then they receive a valid access token
    And the response includes their role "Administrador"

  Scenario: Invalid password
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    When they log in with email "admin@tg-group.local" and password "wrong-password"
    Then they see an invalid credentials error
    And no access token is issued

  Scenario: User does not exist
    Given no user is registered with email "missing@tg-group.local"
    When they log in with email "missing@tg-group.local" and password "whatever"
    Then they see an invalid credentials error
    And no access token is issued

  Scenario: Blocked user
    Given a blocked user "blocked@tg-group.local" with password "correct-password" and role "Administrador"
    When they log in with email "blocked@tg-group.local" and password "correct-password"
    Then they see an invalid credentials error
    And no access token is issued

  Scenario: Successful logout
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And they are logged in
    When they log out
    Then the logout succeeds

  Scenario: A revoked token can no longer be used
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And they are logged in
    And they log out
    When they try to use the same token again
    Then they see an unauthorized error
