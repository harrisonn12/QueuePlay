import useMembershipCards from "../../../hooks/useMembershipCards";

export const MembershipSection = () => {
    const { membershipTiers } = useMembershipCards();

    return (
        <>
            <script
                async
                src='https://js.stripe.com/v3/pricing-table.js'
            ></script>
        </>
    );
};
