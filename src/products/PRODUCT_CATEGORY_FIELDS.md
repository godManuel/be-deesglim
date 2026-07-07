# Product Category Field Specification

This document describes the product creation field requirements currently enforced by the product module.

Validation source of truth:

- DTO shape: src/products/dto/create-product.dto.ts
- Category-specific enforcement: src/products/products.service.ts
- Category enum values: src/products/schemas/category.schema.ts

## Category Enum Values

- Custom Wigs
- Lace Supply
- Closures/Frontals

## Common Required Fields (All Categories)

- name
- price
- category (category id or slug)

Notes:

- slug is optional in request and is auto-generated from name in the service.
- images can be provided either by multipart upload or via the images DTO array.

## Category-Specific Required Fields

### 1) Custom Wigs

Required fields:

- laceSize
- headSize
- color
- grams
- length

Validation behavior:

- Product creation fails if any required field above is missing.

### 2) Closures/Frontals

Required fields:

- laceSize
- length
- color
- quantity
- oldPrice
- newPrice

Validation behavior:

- Product creation fails if any required field above is missing.
- Product final price is taken from newPrice.

### 3) Lace Supply

Required fields (category-specific):

- No extra required fields beyond the common fields.

Validation behavior:

- This is the only category where variants are allowed.

## Variant Rules

- variants are allowed only for Lace Supply.
- If variants are sent for Custom Wigs or Closures/Frontals, product creation fails.

## Optional Fields Supported by DTO

These fields are optional and can be provided when relevant:

- description
- shortDescription
- isVisible
- isFeatured
- customWigType
- laceSizes
- laceTypes
- lengthOptions
- densityOptions
- headSizes
- colors
- allowAnyColor
- laceCustomizationAvailable
- laceTintShades
- textureOptions
- sizeGuidePdfUrl
- skinToneGuidePdfUrl
- images

## Slug Behavior

- Input slug is optional.
- Service generates slug from: slug (if provided) or name.
- If slug already exists, numeric suffix is appended (for example: product-name-1, product-name-2).

## Example Minimal Payloads

### Custom Wigs

{
"name": "Custom Unit A",
"price": 450,
"category": "custom-wigs",
"laceSize": "5x5",
"headSize": 22,
"color": "Natural Black",
"grams": 300,
"length": "20 inches"
}

### Closures/Frontals

{
"name": "HD Frontal 13x4",
"price": 180,
"category": "closuresfrontals",
"laceSize": "13x4",
"length": "18 inches",
"color": "Natural Black",
"quantity": 12,
"oldPrice": 220,
"newPrice": 180
}

### Lace Supply

{
"name": "Lace Adhesive Pro",
"price": 25,
"category": "lace-supply",
"variants": [
{
"name": "30ml",
"price": 25,
"inventoryCount": 40
}
]
}
