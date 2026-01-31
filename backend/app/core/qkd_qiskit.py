import numpy as np
try:
    from qiskit import QuantumCircuit, transpile
except ImportError:
    from qiskit.circuit import QuantumCircuit
    from qiskit.compiler import transpile
from qiskit_aer import AerSimulator
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class QiskitBB84Result(BaseModel):
    alice_bits: List[int]
    alice_bases: List[str]  # 'rect' (+) or 'diag' (x)
    bob_bases: List[str]
    bob_measured_bits: List[int]
    reconciled_key: str
    qber: float
    is_eavesdropped: bool
    intercepted_indices: List[int]
    circuit_depth: int

class QiskitBB84Simulation:
    def __init__(self, num_bits: int = 32):
        self.num_bits = num_bits
        self.simulator = AerSimulator()

    def run_simulation(self, eve_present: bool = False, eve_intercept_prob: float = 0.5) -> QiskitBB84Result:
        alice_bits = np.random.randint(0, 2, self.num_bits)
        alice_bases = np.random.choice(['rect', 'diag'], self.num_bits)
        bob_bases = np.random.choice(['rect', 'diag'], self.num_bits)
        
        bob_measured_bits = []
        intercepted_indices = []
        
        # We simulate each qubit transmission as a Qiskit circuit
        for i in range(self.num_bits):
            # Create a 1-qubit circuit
            qc = QuantumCircuit(1, 1)
            
            # --- Alice Prepares State ---
            # Bit 0, Rect: |0> (do nothing)
            # Bit 1, Rect: |1> (apply X)
            # Bit 0, Diag: |+> (apply H)
            # Bit 1, Diag: |-> (apply X then H)
            
            if alice_bits[i] == 1:
                qc.x(0)
            if alice_bases[i] == 'diag':
                qc.h(0)
            
            # --- Eve Intercepts (Optional) ---
            if eve_present and np.random.random() < eve_intercept_prob:
                intercepted_indices.append(i)
                # Eve picks a random basis to measure in
                eve_basis = np.random.choice(['rect', 'diag'])
                if eve_basis == 'diag':
                    qc.h(0)
                qc.measure(0, 0)
                # After measurement, if Eve measured in Diag, she needs to put it back (approx)
                # Formally, measurement collapses the state. 
                # If Eve measured in rect, state is |0> or |1>.
                # If Eve measured in diag, state is |+> or |->.
                # To Bob, it's just the collapsed state.
                # In Qiskit, measurement collapses the state in the Z-basis by default.
            
            # --- Bob Measures ---
            if bob_bases[i] == 'diag':
                qc.h(0)
            qc.measure(0, 0)
            
            # Run the circuit
            compiled_circuit = transpile(qc, self.simulator)
            job = self.simulator.run(compiled_circuit, shots=1)
            result = job.result()
            counts = result.get_counts(qc)
            
            # Get the measured bit (0 or 1)
            measured_bit = int(list(counts.keys())[0])
            bob_measured_bits.append(measured_bit)

        # --- Basis Reconciliation ---
        reconciled_bits = []
        errors = 0
        total_reconciled = 0
        
        for i in range(self.num_bits):
            if alice_bases[i] == bob_bases[i]:
                total_reconciled += 1
                reconciled_bits.append(bob_measured_bits[i])
                if alice_bits[i] != bob_measured_bits[i]:
                    errors += 1
        
        qber = (errors / total_reconciled) if total_reconciled > 0 else 0
        is_eavesdropped = qber > 0.11 # Threshold for eavesdropping
        
        reconciled_key = "".join(map(str, reconciled_bits))
        
        return QiskitBB84Result(
            alice_bits=alice_bits.tolist(),
            alice_bases=alice_bases.tolist(),
            bob_bases=bob_bases.tolist(),
            bob_measured_bits=bob_measured_bits,
            reconciled_key=reconciled_key,
            qber=qber,
            is_eavesdropped=is_eavesdropped,
            intercepted_indices=intercepted_indices,
            circuit_depth=qc.depth() # Last circuit depth
        )

if __name__ == "__main__":
    sim = QiskitBB84Simulation(num_bits=20)
    print("Running simulation with NO Eve...")
    res = sim.run_simulation(eve_present=False)
    print(f"QBER: {res.qber:.2f}, Eavesdropped: {res.is_eavesdropped}")
    
    print("\nRunning simulation WITH Eve...")
    res_eve = sim.run_simulation(eve_present=True)
    print(f"QBER: {res_eve.qber:.2f}, Eavesdropped: {res_eve.is_eavesdropped}")
    print(f"Intercepted indices: {res_eve.intercepted_indices}")
