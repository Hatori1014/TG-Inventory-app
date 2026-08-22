Feature: Panel of products in alert
  As any authenticated user
  I want to see which products are at or below their minimum stock
  So that I can act quickly before they run out

  Scenario: A product whose total stock across locations is below its minimum appears in the panel
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And an existing product "p1" named "Arroz"
    And that product has a minimum of 10 defined
    And that product has 5 units of stock at location "l1"
    And that product has 1 unit of stock at location "l2"
    And that product has 3 units of stock at location "l3"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they request the alerts panel
    Then the response is successful
    And the panel includes "Arroz" with a total of 9

  Scenario: A product whose total stock exactly equals its minimum still alerts
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And an existing product "p1" named "Arroz"
    And that product has a minimum of 10 defined
    And that product has 10 units of stock at location "l1"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they request the alerts panel
    Then the response is successful
    And the panel includes "Arroz" with a total of 10

  Scenario: A product whose total stock is above its minimum does not appear in the panel
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And an existing product "p1" named "Arroz"
    And that product has a minimum of 10 defined
    And that product has 20 units of stock at location "l1"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they request the alerts panel
    Then the response is successful
    And the panel does not include "Arroz"

  Scenario: A product with a minimum defined but no stock anywhere still alerts
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And an existing product "p1" named "Arroz"
    And that product has a minimum of 5 defined
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they request the alerts panel
    Then the response is successful
    And the panel includes "Arroz" with a total of 0

  Scenario: The most urgent product (largest deficit) appears first
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And an existing product "p1" named "Arroz"
    And that product has a minimum of 10 defined
    And that product has 9 units of stock at location "l1"
    And an existing product "p2" named "Sal"
    And that product has a minimum of 3 defined
    And that product has 0 units of stock at location "l1"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they request the alerts panel
    Then the response is successful
    And "Sal" appears before "Arroz" in the panel

  Scenario: A user with no special permission can still view the alerts panel
    Given a user "guest@tg-group.local" with password "correct-password" and role "Invitado"
    And an existing product "p1" named "Arroz"
    And that product has a minimum of 10 defined
    And that product has 5 units of stock at location "l1"
    When they log in with email "guest@tg-group.local" and password "correct-password"
    And they request the alerts panel
    Then the response is successful
    And the panel includes "Arroz" with a total of 5
