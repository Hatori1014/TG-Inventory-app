Feature: Manage product images
  As an inventory administrator
  I want to attach a validated image to a product
  So that I can identify products visually without risking malicious uploads

  Scenario: Administrator uploads a valid image for a product
    Given a user "admin@tg.local" with password "Secret123!" and role "Administrador"
    And the role "Administrador" has permission "products" "update"
    And an existing product "Arroz" with an existing unit "Kg"
    When they log in with email "admin@tg.local" and password "Secret123!"
    And they upload a valid JPEG image for that product
    Then the image is accepted
    And the product's imageUrl is set

  Scenario: Uploading a file whose real content is not an image is rejected
    Given a user "admin@tg.local" with password "Secret123!" and role "Administrador"
    And the role "Administrador" has permission "products" "update"
    And an existing product "Arroz" with an existing unit "Kg"
    When they log in with email "admin@tg.local" and password "Secret123!"
    And they upload a file disguised as an image for that product
    Then the upload is rejected as an invalid image

  Scenario: A user without products:update permission cannot upload an image
    Given a user "juan@tg.local" with password "Secret123!" and role "Consulta"
    And the role "Consulta" does not have permission "products" "update"
    And an existing product "Arroz" with an existing unit "Kg"
    When they log in with email "juan@tg.local" and password "Secret123!"
    And they upload a valid JPEG image for that product
    Then the upload is forbidden

  Scenario: Replacing an existing image deletes the previous one from storage
    Given a user "admin@tg.local" with password "Secret123!" and role "Administrador"
    And the role "Administrador" has permission "products" "update"
    And an existing product "Arroz" with an existing unit "Kg" and an existing image
    When they log in with email "admin@tg.local" and password "Secret123!"
    And they upload a valid JPEG image for that product
    Then the image is accepted
    And the previous image was deleted from storage
