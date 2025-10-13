with

source as (

    select * from {{ ref('raw_supplies') }}

),

renamed as (

    select

        ----------  ids
        id || '-' || sku as supply_uuid,
        id as supply_id,
        sku as product_id,

        ---------- text
        name as supply_name,

        ---------- numerics
        cost / 100.0 as supply_cost,

        ---------- booleans
        perishable as is_perishable_supply

    from source

)

select * from renamed
