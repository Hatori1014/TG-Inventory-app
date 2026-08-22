Feature: Internal consumption requests
  As a requester
  I want to request internal consumption of inventory from a location
  So that it can later be reviewed by an approver

  Scenario: Requester creates a consumption request within available stock
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And the role "Solicitante" has permission "requests" "create"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    And that product has 10 units of stock at "Bodega Central"
    When they log in with email "requester@tg-group.local" and password "correct-password"
    And they request 5 units of "Arroz" from "Bodega Central"
    Then the request is created successfully
    And the request status is "pending"

  Scenario: Requester can request exactly the available stock
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And the role "Solicitante" has permission "requests" "create"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    And that product has 5 units of stock at "Bodega Central"
    When they log in with email "requester@tg-group.local" and password "correct-password"
    And they request 5 units of "Arroz" from "Bodega Central"
    Then the request is created successfully

  Scenario: Requesting more than the available stock is rejected
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And the role "Solicitante" has permission "requests" "create"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    And that product has 3 units of stock at "Bodega Central"
    When they log in with email "requester@tg-group.local" and password "correct-password"
    And they request 5 units of "Arroz" from "Bodega Central"
    Then they receive a bad request error

  Scenario: Requesting from a location with no stock at all is rejected
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And the role "Solicitante" has permission "requests" "create"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    When they log in with email "requester@tg-group.local" and password "correct-password"
    And they request 5 units of "Arroz" from "Bodega Central"
    Then they receive a bad request error

  Scenario: A consumption request cannot include a supplier
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And the role "Solicitante" has permission "requests" "create"
    And an existing active supplier "Acme Corp"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    And that product has 10 units of stock at "Bodega Central"
    When they log in with email "requester@tg-group.local" and password "correct-password"
    And they request 5 units of "Arroz" from "Bodega Central" naming supplier "Acme Corp"
    Then they receive a bad request error

  Scenario: A consumption request cannot be saved as a draft
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And the role "Solicitante" has permission "requests" "create"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    And that product has 10 units of stock at "Bodega Central"
    When they log in with email "requester@tg-group.local" and password "correct-password"
    And they try to save 5 units of "Arroz" from "Bodega Central" as a draft
    Then they receive a bad request error

  Scenario: Creating a consumption request with no items is rejected
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And the role "Solicitante" has permission "requests" "create"
    When they log in with email "requester@tg-group.local" and password "correct-password"
    And they submit an empty consumption request
    Then they receive a bad request error

  Scenario: A user without the requests:create permission cannot create a consumption request
    Given a user "guest@tg-group.local" with password "correct-password" and role "Invitado"
    And the role "Invitado" does not have permission "requests" "create"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    And that product has 10 units of stock at "Bodega Central"
    When they log in with email "guest@tg-group.local" and password "correct-password"
    And they attempt to request 5 units of "Arroz" from "Bodega Central"
    Then they receive a forbidden error
