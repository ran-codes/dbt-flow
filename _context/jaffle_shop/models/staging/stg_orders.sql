with

source as (

    select * from {{ ref('raw_orders') }}

),

renamed as (

    select

        ----------  ids
        id as order_id,
        store_id as location_id,
        customer as customer_id,

        ---------- numerics
        subtotal as subtotal_cents,
        tax_paid as tax_paid_cents,
        order_total as order_total_cents,
        subtotal / 100.0 as subtotal,
        tax_paid / 100.0 as tax_paid,
        order_total / 100.0 as order_total,

        ---------- timestamps
        ordered_at

    from source

)

select * from renamed
