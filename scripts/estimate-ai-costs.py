"""Illustrative monthly sizing; not a provider quotation or measured benchmark."""
import math
INTERACTIONS_PER_USER=20
ASSISTANCE_FRACTION=0.30
LOCAL_FRACTION=0.60
REQUEST_SECONDS=10
MONTH_HOURS=720
TARGET_UTILIZATION=0.50
GPU_EUR_MONTH=300
API_EUR_MONTH=20
STATIC_EUR_MONTH=10
MODEL_GB=0.5
EGRESS_EUR_GB=0.02
CAPACITY=MONTH_HOURS*3600*TARGET_UTILIZATION/REQUEST_SECONDS
print('Capacity per GPU/month:',int(CAPACITY),'assisted requests under assumptions')
for users in [100,1000,10000]:
    total=users*INTERACTIONS_PER_USER
    assisted=round(total*ASSISTANCE_FRACTION)
    hybrid=round(assisted*(1-LOCAL_FRACTION))
    local=STATIC_EUR_MONTH+users*MODEL_GB*EGRESS_EUR_GB
    server=STATIC_EUR_MONTH+API_EUR_MONTH+max(1,math.ceil(assisted/CAPACITY))*GPU_EUR_MONTH
    mixed=STATIC_EUR_MONTH+API_EUR_MONTH+max(1,math.ceil(hybrid/CAPACITY))*GPU_EUR_MONTH+users*LOCAL_FRACTION*MODEL_GB*EGRESS_EUR_GB
    print(f'{users}: total={total}, assisted={assisted}, hybrid-server={hybrid}, local={local:.2f} EUR, server={server:.2f} EUR, hybrid={mixed:.2f} EUR')
